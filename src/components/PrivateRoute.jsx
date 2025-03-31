import React from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ userRole, allowedRoles, children }) => {
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default PrivateRoute;
