import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../actions/authActions";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Dashboard.module.css";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";

const Dashboard = function() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector(state => state.user);
    
    const [formData, setFormData] = useState({
        name: "",
    });
    const [popupShowing, setPopupShowing] = useState(false);
    const [boards, setBoards] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);

    const handleLogout = () => {
        dispatch(logoutUser());
    };

    const handleChange = function(e) {
        const {name, value} = e.target;
        setFormData(prevData => {
            return {
                ...prevData,
                [name]: value,
            }
        })
    }

    const handleBoardClick = (boardId) => {
        navigate(`/boards/${boardId}`);
    };
    
    const fetchBoards = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const csrf_token = Cookies.get('csrf_token');
            const response = await fetch('http://localhost:8000/api/boards', {
                method: 'GET',
                headers: {
                    'Accept': "application/json",
                    'Content-Type': "application/json",
                    'X-XSRF-TOKEN': csrf_token,
                },
                credentials: 'include',
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('API Response:', data); // Debug log
                
                // Handle the API response structure based on your Laravel controller
                if (data && Array.isArray(data.boards)) {
                    setBoards(data.boards);
                } else if (Array.isArray(data)) {
                    setBoards(data);
                } else {
                    console.error('Unexpected API response structure:', data);
                    setBoards([]);
                    setError('Unexpected data format received from server');
                }
            } else {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                setError(`Failed to fetch boards: ${response.status}`);
                setBoards([]);
            }
        } catch (error) {
            console.error('Failed to fetch boards:', error);
            setError('Network error occurred while fetching boards');
            setBoards([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async function(e) {
        e.preventDefault();
        if (!formData.name.trim()) return;
        
        setIsCreating(true);
        try {
            const csrf_token = Cookies.get('csrf_token');
            const response = await fetch('http://localhost:8000/api/boards', {
                method: 'POST',
                headers: {
                    'Accept': "application/json",
                    'Content-Type': "application/json",
                    'X-XSRF-TOKEN': csrf_token,
                },
                credentials: 'include',
                body: JSON.stringify(formData),
            });
            
            if (response.ok) {
                setPopupShowing(false);
                setFormData({ name: "" });
                fetchBoards(); // Refresh the boards list
            } else {
                const errorText = await response.text();
                console.error('Failed to create board:', response.status, errorText);
                setError(`Failed to create board: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to create board:', error);
            setError('Network error occurred while creating board');
        } finally {
            setIsCreating(false);
        }
    };

    const closePopup = () => {
        setPopupShowing(false);
        setFormData({ name: "" });
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            closePopup();
        }
    };

    useEffect(() => {
        fetchBoards();
    }, []);

    return (
        <>
            <div className={styles.dashboard}>
                <div onClick={handleLogout} className={styles.logoutButton}>
                    <img src="/logout.svg" width="20px" alt="Logout" />
                </div>

                <div className={styles.boards}>
                    <div className={styles.container}>
                        <div className={styles.add} onClick={() => setPopupShowing(true)}>
                            +
                        </div>
                        
                        {error && (
                            <div className={styles.error}>
                                {error}
                                <button onClick={fetchBoards} style={{marginLeft: '10px'}}>
                                    Retry
                                </button>
                            </div>
                        )}
                        
                        {isLoading ? (
                            <div className={styles.loading}>Loading boards...</div>
                        ) : (
                            // Safe array check with fallback
                            Array.isArray(boards) && boards.length > 0 ? (
                                boards.map((board) => (
                                    <div 
                                        key={board.id} 
                                        className={styles.board}
                                        onClick={() => handleBoardClick(board.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {board.name}
                                    </div>
                                ))
                            ) : (
                                !error && <div className={styles.noBoards}>No boards found. Create your first board!</div>
                            )
                        )}
                    </div>
                </div>

                {popupShowing && (
                    <div className={styles.popupBackdrop} onClick={handleBackdropClick}>
                        <form className={styles.addBoardPopup} onSubmit={handleSubmit}>
                            <div className={styles.popupHeader}>
                                <h3>Create New Board</h3>
                                <button 
                                    type="button" 
                                    className={styles.closeButton}
                                    onClick={closePopup}
                                >
                                    ×
                                </button>
                            </div>
                            <input 
                                type="text" 
                                name="name" 
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Board name..."
                                required
                                disabled={isCreating}
                            />
                            <button type="submit" disabled={isCreating || !formData.name.trim()}>
                                {isCreating ? 'Creating...' : 'Create Board'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </>
    );
}

export default Dashboard;