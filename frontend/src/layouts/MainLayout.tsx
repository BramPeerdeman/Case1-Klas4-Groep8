import React, { useEffect } from "react";
import { Box, Container, Button } from "@mui/material";
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
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Skip to Content Link 
        - Hidden visually by default (off-screen)
        - Becomes visible on focus (Tab key)
        - Z-index ensures it sits on top of the Navbar when active
      */}
      <Button
        component="a"
        href="#main-content"
        sx={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          zIndex: 1400, // Higher than standard AppBar (1100)
          "&:focus": {
            position: "fixed",
            top: "16px",
            left: "16px",
            width: "auto",
            height: "auto",
            padding: 2,
            backgroundColor: "background.paper",
            color: "primary.main",
            boxShadow: 6,
            borderRadius: 1,
            textDecoration: "none",
          },
        }}
      >
        Spring naar inhoud
      </Button>

      <Navbar />

      {/* Main Content Area */}
      <Container
        component="main"
        id="main-content" // Target for the skip link
        maxWidth="xl"
        sx={{ flexGrow: 1, py: 4 }}
        tabIndex={-1} // Ensures the container can receive focus programmatically if needed
      >
        <Outlet />
      </Container>
      
      <Footer />
    </Box>
  );
};

export default MainLayout;