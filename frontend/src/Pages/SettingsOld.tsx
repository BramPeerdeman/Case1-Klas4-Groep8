// import { jwtDecode } from "jwt-decode";
// import { useState } from "react";
// import { Container, Typography, Card, CardContent, Box, TextField, Button } from "@mui/material";

// interface JwtPayload {
//   sub: string;   // gebruiker.Id
//   email: string;
//   name: string;
//   jti: string;
// }

// import { useUser } from "../Contexts/UserContext";

// export default function Settings() {
//   const { user, setUser } = useUser();
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");

//   async function updateUsername(userId: string, newUsername: string, password: string, token: string) {
//     const response = await fetch(`/api/Gebruiker/${userId}/username`, {
//       method: "PUT",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${token}`
//       },
//       body: JSON.stringify({ newUsername, currentPassword: password })
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.message || "Update mislukt");
//     }

//     const data = await response.json();

//     if (data.token) {
//       localStorage.setItem("token", data.token);
//       const newDecoded = jwtDecode<JwtPayload>(data.token);
//       setUser(newDecoded); // update context instead of reload
//     }
//   }

//   return (
//     <Container sx={{ py: 4 }}>
//       <Typography variant="h4" gutterBottom>Instellingen</Typography>
//       <Card>
//         <CardContent>
//           <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
//             <TextField
//               label="Huidige Gebruikersnaam"
//               value={user?.name || ""}
//               disabled
//             />
//             <TextField
//               label="Nieuwe Gebruikersnaam"
//               value={username}
//               onChange={(e) => setUsername(e.target.value)}
//             />
//             <TextField
//               label="Wachtwoord"
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//             />

//             <Button
//               variant="contained"
//               onClick={() => {
//                 if (user?.sub && localStorage.getItem("token")) {
//                   updateUsername(user.sub, username, password, localStorage.getItem("token")!)
//                     .then(() => {
//                       alert("Gebruikersnaam bijgewerkt!");
//                       setUsername("");
//                       setPassword("");
//                     })
//                     .catch(err => alert(err.message));
//                 }
//               }}
//             >
//               Opslaan
//             </Button>
//           </Box>
//         </CardContent>
//       </Card>
//     </Container>
//   );
// }

// import { jwtDecode } from "jwt-decode";
// import { useState, useEffect } from "react";
// import { Container, Typography, Card, CardContent, Box, TextField, Button, Switch, Slider } from "@mui/material";
// import { useUser } from "../Contexts/UserContext";

// interface JwtPayload {
//   sub: string;
//   email: string;
//   name: string;
//   jti: string;
// }

// interface UiSettings {
//   theme?: "light" | "dark";
//   highContrast?: boolean;
//   fontSize?: number;
// }

// export default function Settings() {
//   const { user, setUser } = useUser();
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [uiSettings, setUiSettings] = useState<UiSettings>({ theme: "light", highContrast: false, fontSize: 16 });

//   const token = localStorage.getItem("token");

//   // Load UiSettings from backend
//   useEffect(() => {
//     if (user?.sub && token) {
//       fetch(`/api/Gebruiker/${user.sub}/uisettings`, {
//         headers: { Authorization: `Bearer ${token}` }
//       })
//         .then(res => res.json())
//         .then(data => {
//           const parsed = typeof data === "string" ? JSON.parse(data) : data;
//           setUiSettings(parsed);
//         });
//     }
//   }, [user?.sub, token]);

//   async function updateUsername(userId: string, newUsername: string, password: string, token: string) {
//     const response = await fetch(`/api/Gebruiker/${userId}/username`, {
//       method: "PUT",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${token}`
//       },
//       body: JSON.stringify({ newUsername, currentPassword: password })
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.message || "Update mislukt");
//     }

//     const data = await response.json();

//     if (data.token) {
//       localStorage.setItem("token", data.token);
//       const newDecoded = jwtDecode<JwtPayload>(data.token);
//       setUser(newDecoded);
//     }
//   }

//   async function saveUiSettings(newSettings: UiSettings) {
//     if (!user?.sub || !token) return;
//     await fetch(`/api/Gebruiker/${user.sub}/uisettings`, {
//       method: "PUT",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${token}`
//       },
//       body: JSON.stringify(newSettings)
//     });
//     setUiSettings(newSettings);
//   }

//   return (
//     <Container sx={{ py: 4 }}>
//       <Typography variant="h4" gutterBottom>Instellingen</Typography>
//       <Card>
//         <CardContent>
//           <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
//             {/* Username Section */}
//             <TextField label="Huidige Gebruikersnaam" value={user?.name || ""} disabled />
//             <TextField label="Nieuwe Gebruikersnaam" value={username} onChange={(e) => setUsername(e.target.value)} />
//             <TextField label="Wachtwoord" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
//             <Button
//               variant="contained"
//               onClick={() => {
//                 if (user?.sub && token) {
//                   updateUsername(user.sub, username, password, token)
//                     .then(() => {
//                       alert("Gebruikersnaam bijgewerkt!");
//                       setUsername("");
//                       setPassword("");
//                     })
//                     .catch(err => alert(err.message));
//                 }
//               }}
//             >
//               Opslaan
//             </Button>

//             {/* Accessibility Section */}
//             <Typography variant="h6" sx={{ mt: 3 }}>UI Settings</Typography>

//             <Typography>Dark Mode</Typography>
//             <Switch
//               checked={uiSettings.theme === "dark"}
//               onChange={(e) =>
//                 saveUiSettings({ ...uiSettings, theme: e.target.checked ? "dark" : "light" })
//               }
//             />

//             <Typography>High Contrast</Typography>
//             <Switch
//               checked={uiSettings.highContrast || false}
//               onChange={(e) =>
//                 saveUiSettings({ ...uiSettings, highContrast: e.target.checked })
//               }
//             />

//             <Typography>Font Size</Typography>
//             <Slider
//               min={12}
//               max={24}
//               step={1}
//               value={uiSettings.fontSize || 16}
//               onChange={(e, value) =>
//                 saveUiSettings({ ...uiSettings, fontSize: value as number })
//               }
//             />
//           </Box>
//         </CardContent>
//       </Card>
//     </Container>
//   );
// }