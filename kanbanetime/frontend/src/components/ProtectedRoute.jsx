import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { checkAuthStatus } from '../actions/authActions';

const ProtectedRoute = ({ children, requireAuth = true }) => {
    const dispatch = useDispatch();
    const { isAuthenticated, isLoading } = useSelector(state => state.user);

    useEffect(() => {
        dispatch(checkAuthStatus());
    }, [dispatch]);

    if (isLoading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '18px'
            }}>
                Loading...
            </div>
        );
    }

    // If route requires authentication and user is not authenticated, redirect to landing
    if (requireAuth && !isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // If route doesn't require authentication (public routes) and user is authenticated, redirect to dashboard
    if (!requireAuth && isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;