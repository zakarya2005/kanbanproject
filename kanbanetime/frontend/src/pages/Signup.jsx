import { Link, useNavigate } from "react-router-dom";
import styles from "../styles/Signup.module.css";
import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser, clearError } from "../actions/authActions";

const Signup = function() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isLoading, error } = useSelector(state => state.user);
    
    const [formData, setFormData] = useState({
        'username': "",
        'email': "",
        'password': "",
        'password_confirmation': "",
    });

    const handleSubmit = useCallback(async function(e) {
        e.preventDefault();
        dispatch(clearError());
        
        const result = await dispatch(registerUser(formData));
        
        if (result.success) {
            navigate('/dashboard');
        }
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
                        disabled={isLoading}
                    />
                </div>
                <label htmlFor="email">email</label>
                <div className="email">
                    <input 
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
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
                        disabled={isLoading}
                    />
                </div>
                <label htmlFor="password_confirmation">password confirmation</label>
                <div className="password_confirmation">
                    <input 
                        type="password"
                        id="password_confirmation"
                        name="password_confirmation"
                        value={formData.password_confirmation}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'loading...' : 'sign up'}
                </button>
                {error && <p style={{color: "red"}}>{error}</p>}
                <Link to="/login">I already have an account</Link>
            </form>
        </div>
    );
}

export default Signup;