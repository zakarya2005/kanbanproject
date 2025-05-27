const initialState = {
    user: null,
    isAuthenticated: false,
    isCheckingAuth: false,
    isLoggingIn: false,
    isRegistering: false,
    error: null,
};

const userReducer = function(state = initialState, action) {
    switch (action.type) {
        case 'AUTH_CHECK_START':
            return {
                ...state,
                isCheckingAuth: true,
                error: null,
            };
        case 'AUTH_CHECK_COMPLETE':
            return {
                ...state,
                isCheckingAuth: false,
            };
        case 'LOGIN_START':
            return {
                ...state,
                isLoggingIn: true,
                error: null,
            };
        case 'REGISTER_START':
            return {
                ...state,
                isRegistering: true,
                error: null,
            };
        case 'AUTH_SUCCESS':
            return {
                ...state,
                user: action.payload,
                isAuthenticated: true,
                isCheckingAuth: false,
                isLoggingIn: false,
                isRegistering: false,
                error: null,
            };
        case 'AUTH_FAILURE':
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                isCheckingAuth: false,
                isLoggingIn: false,
                isRegistering: false,
                error: action.payload,
            };
        case 'LOGOUT':
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                isCheckingAuth: false,
                isLoggingIn: false,
                isRegistering: false,
                error: null,
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export default userReducer;