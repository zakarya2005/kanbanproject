import { Link, useNavigate } from "react-router-dom";
import styles from "../styles/Login.module.css";
import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, clearError } from "../actions/authActions";

const Login = function() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isLoggingIn, error } = useSelector(state => state.user);
    
    const [formData, setFormData] = useState({
        'username': "",
        'password': "",
    });

    const handleSubmit = useCallback(async function(e) {
        e.preventDefault();
        dispatch(clearError());
        
        const result = await dispatch(loginUser(formData));
        
        if (result.success) {
            navigate('/dashboard');
        }
        // Don't clear form data on failure - let user retry with same values
    }, [formData, navigate, dispatch]);

    const handleChange = useCallback(function(e) {
        const {name, value} = e.target;
        setFormData(prevData => {
            return {
                ...prevData,
                [name]: value,
            };
        });
    }, []);

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <label htmlFor="username">username</label>
                <div className="username">
                    <input 
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        disabled={isLoggingIn}
                    />
                </div>
                <label htmlFor="password">password</label>
                <div className="password">
                    <input 
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={isLoggingIn}
                    />
                </div>
                <button type="submit" disabled={isLoggingIn}>
                    {isLoggingIn ? 'loading...' : 'login'}
                </button>
                {error && <div>{error}</div>}
                <Link to="/signup">I don't have an account</Link>
            </form>
        </div>
    );
}

export default Login;