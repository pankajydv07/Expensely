import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import expenseReducer from './expenseSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    expense: expenseReducer,
    // Add other reducers here as needed
    // approvals: approvalsReducer,
    // notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;

