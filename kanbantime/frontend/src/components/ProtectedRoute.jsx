import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { checkAuthStatus } from '../actions/authActions';
import './Spinner.css';

const ProtectedRoute = ({ children, requireAuth = true }) => {
    const dispatch = useDispatch();
    const { isAuthenticated, isCheckingAuth } = useSelector(state => state.user);

    useEffect(() => {
        dispatch(checkAuthStatus());
    }, [dispatch]);

    if (isCheckingAuth) {
        return (
            <div className="spinner-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (requireAuth && !isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (!requireAuth && isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;