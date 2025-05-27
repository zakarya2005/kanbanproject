// Action creators
export const authStart = () => ({
    type: 'AUTH_START'
});

export const authSuccess = (user) => ({
    type: 'AUTH_SUCCESS',
    payload: user
});

export const authFailure = (error) => ({
    type: 'AUTH_FAILURE',
    payload: error
});

export const logout = () => ({
    type: 'LOGOUT'
});

export const clearError = () => ({
    type: 'CLEAR_ERROR'
});

// New action types for different loading states
export const loginStart = () => ({
    type: 'LOGIN_START'
});

export const registerStart = () => ({
    type: 'REGISTER_START'
});

export const authCheckStart = () => ({
    type: 'AUTH_CHECK_START'
});

export const authCheckComplete = () => ({
    type: 'AUTH_CHECK_COMPLETE'
});

// Helper function to get CSRF token from cookies
const getCsrfToken = () => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrf_token') {
            return decodeURIComponent(value);
        }
    }
    return null;
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
    const csrfToken = getCsrfToken();
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
    }

    return fetch(url, {
        credentials: 'include',
        ...options,
        headers
    });
};

// Thunk actions
export const checkAuthStatus = () => {
    return async (dispatch) => {
        dispatch(authCheckStart());
        
        try {
            const response = await makeAuthenticatedRequest('http://localhost:8000/api/user', {
                method: 'GET'
            });

            if (response.ok) {
                const userData = await response.json();
                dispatch(authSuccess(userData));
            } else if (response.status === 401) {
                // Try to refresh token
                const refreshResponse = await fetch('http://localhost:8000/api/refresh', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                if (refreshResponse.ok) {
                    // Retry getting user data after refresh
                    const retryResponse = await makeAuthenticatedRequest('http://localhost:8000/api/user', {
                        method: 'GET'
                    });

                    if (retryResponse.ok) {
                        const userData = await retryResponse.json();
                        dispatch(authSuccess(userData));
                    } else {
                        // Silent failure for auth check - don't show error
                        dispatch(authCheckComplete());
                    }
                } else {
                    // Silent failure for auth check - don't show error
                    dispatch(authCheckComplete());
                }
            } else {
                // Silent failure for auth check - don't show error
                dispatch(authCheckComplete());
            }
        } catch (error) {
            // Silent failure for auth check - don't show error
            dispatch(authCheckComplete());
        }
    };
};

export const loginUser = (credentials) => {
    return async (dispatch) => {
        dispatch(loginStart());

        try {
            const response = await fetch('http://localhost:8000/api/login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (response.ok && !data.error) {
                // Get user data after successful login
                const userResponse = await makeAuthenticatedRequest('http://localhost:8000/api/user', {
                    method: 'GET'
                });

                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    dispatch(authSuccess(userData));
                    return { success: true };
                } else {
                    dispatch(authFailure('Failed to get user data'));
                    return { success: false, error: 'Failed to get user data' };
                }
            } else {
                dispatch(authFailure(data.error || 'Login failed'));
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            dispatch(authFailure('Network error'));
            return { success: false, error: 'Network error' };
        }
    };
};

export const registerUser = (userData) => {
    return async (dispatch) => {
        dispatch(registerStart());

        try {
            const response = await fetch('http://localhost:8000/api/register', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok && !data.error) {
                // Get user data after successful registration
                const userResponse = await makeAuthenticatedRequest('http://localhost:8000/api/user', {
                    method: 'GET'
                });

                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    dispatch(authSuccess(userData));
                    return { success: true };
                } else {
                    dispatch(authFailure('Failed to get user data'));
                    return { success: false, error: 'Failed to get user data' };
                }
            } else {
                dispatch(authFailure(data.error || 'Registration failed'));
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (error) {
            dispatch(authFailure('Network error'));
            return { success: false, error: 'Network error' };
        }
    };
};

export const logoutUser = () => {
    return async (dispatch) => {
        try {
            await makeAuthenticatedRequest('http://localhost:8000/api/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Logout request failed:', error);
        } finally {
            dispatch(logout());
        }
    };
};
