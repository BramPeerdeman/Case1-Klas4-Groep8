import React, { useEffect } from "react";
import { Box, Container } from "@mui/material";
import { Outlet } from "react-router-dom";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import * as signalR from "@microsoft/signalr";
import { useUser } from "../Contexts/UserContext";
import { useNotification } from "../Contexts/NotificationContext";

const MainLayout: React.FC = () => {
  const { user } = useUser();
  const { notify } = useNotification();
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  useEffect(() => {
    // Initialize SignalR connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/AuctionHub`)
      .withAutomaticReconnect()
      .build();

    const startConnection = async () => {
      try {
        await connection.start();
        console.log("Global Notification Service Connected");
      } catch (err) {
        console.error("SignalR Connection Error: ", err);
      }
    };

    startConnection();

    // Listen for auction results
    connection.on("ReceiveAuctionResult", (data: any) => {
      // Check if the current user is the seller
      if (user && data.sellerId && user.sub === data.sellerId) {
        const productName = data.productName || "Product"; // Fallback if name is missing
        notify(
          `Je product ${productName} is zojuist verkocht voor €${data.price.toFixed(2)}!`, 
          "success", 
          "top-center" // Prominent position for sales
        );
      }
    });

    // Cleanup on unmount
    return () => {
      connection.stop().catch(err => console.error("Error stopping connection", err));
    };
  }, [user, notify, baseUrl]);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      <Navbar />
      <Container component="main" sx={{ mt: 4, flexGrow: 1 }}>
        <Outlet />
      </Container>
      <Footer />
    </Box>
  );
};

export default MainLayout;