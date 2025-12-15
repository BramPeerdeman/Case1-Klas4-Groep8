import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { Snackbar, Alert, type AlertColor, type SnackbarOrigin } from '@mui/material';

type NotificationPosition = 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right';

interface NotificationContextType {
  notify: (msg: string, severity?: AlertColor, pos?: NotificationPosition) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('info');
  
  const [anchorState, setAnchorState] = useState<SnackbarOrigin>({
    vertical: 'bottom',
    horizontal: 'right',
  });

  const notify = (
    msg: string, 
    sev: AlertColor = 'success', 
    pos: NotificationPosition = 'bottom-right'
  ) => {
    setMessage(msg);
    setSeverity(sev);

    // Map strings to MUI object
    if (pos === 'top-center') {
      setAnchorState({ vertical: 'top', horizontal: 'center' });
    } else if (pos === 'top-right') {
      setAnchorState({ vertical: 'top', horizontal: 'right' });
    } else if (pos === 'bottom-left') {
      setAnchorState({ vertical: 'bottom', horizontal: 'left' });
    } else {
      setAnchorState({ vertical: 'bottom', horizontal: 'right' });
    }

    setOpen(true);
  };

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  // Helper boolean to style "Top" notifications differently
  const isImportant = anchorState.vertical === 'top';

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <Snackbar 
        open={open} 
        autoHideDuration={isImportant ? 6000 : 4000} // Give users more time to read important alerts
        onClose={handleClose}
        anchorOrigin={anchorState}
        // Move top notifications down slightly so they don't hit the browser edge
        sx={isImportant ? { top: { xs: 20, sm: 50 } } : undefined} 
      >
        <Alert 
          onClose={handleClose} 
          severity={severity} 
          variant="filled"
          elevation={isImportant ? 6 : 1} // Deeper shadow for important ones
          sx={{ 
            width: '100%',
            // DYNAMIC STYLING BLOCK
            ...(isImportant && {
                minWidth: { xs: '90vw', sm: '400px' }, // Much wider on top
                fontSize: '1.1rem',                    // Larger Text
                padding: '12px 24px',                  // More breathing room
                fontWeight: 'bold',                    // Bolder text
                border: '1px solid rgba(255,255,255,0.3)' // Subtle border
            })
          }} 
        >
          {message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification error');
  return context;
};