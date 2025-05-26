import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../actions/authActions";

const Dashboard = function() {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.user);

    const handleLogout = () => {
        dispatch(logoutUser());
    };

    return (
        <>
            <div style={{ 
                padding: '20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid #eee'
            }}>
                <div>
                    <h1>Dashboard</h1>
                    {user && (
                        <p>Welcome back, <strong>{user.username}</strong>!</p>
                    )}
                </div>
                <button 
                    onClick={handleLogout}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Logout
                </button>
            </div>
            <div style={{ padding: '20px' }}>
                {/* Your dashboard content will go here */}
                <p>This is your protected dashboard area.</p>
            </div>
        </>
    );
}

export default Dashboard;