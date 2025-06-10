import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import io from "socket.io-client";
import styles from "../styles/Board.module.css";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from '../actions/authActions';

const Board = function() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [board, setBoard] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [draggedTask, setDraggedTask] = useState(null);
    const [showAddTask, setShowAddTask] = useState(null);
    const [newTaskContent, setNewTaskContent] = useState("");
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [dragOverColumn, setDragOverColumn] = useState(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const [typingUsers, setTypingUsers] = useState({});
    
    // Member management states
    const [newMemberUsername, setNewMemberUsername] = useState("");
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [memberError, setMemberError] = useState("");
    
    // Board settings states
    const [boardName, setBoardName] = useState("");
    const [isUpdatingBoard, setIsUpdatingBoard] = useState(false);
    const [isDeletingBoard, setIsDeletingBoard] = useState(false);

    const { user } = useSelector(state => state.user);
    const socketRef = useRef(null);
    const typingTimeoutRef = useRef({});

    const columns = [
        { id: 'todo', title: 'To Do', color: '#e3f2fd' },
        { id: 'doing', title: 'In Progress', color: '#fff3e0' },
        { id: 'done', title: 'Done', color: '#e8f5e8' },
        { id: 'stopped', title: 'Stopped', color: '#ffebee' }
    ];

    const dispatch = useDispatch();

    // Socket.IO setup and cleanup
    useEffect(() => {
        if (!user || !id) return;

        // Initialize socket connection
        socketRef.current = io('http://localhost:3001', {
            withCredentials: true,
            transports: ['websocket']
        });

        const socket = socketRef.current;

        // Join the board room
        socket.emit('join-board', id, user.id);

        // Socket event listeners
        socket.on('online-count', (count) => {
            setOnlineCount(count);
        });

        socket.on('task-created', (data) => {
            fetchTasks(); // Refresh tasks to get the new one
        });

        socket.on('task-updated', (data) => {
            fetchTasks(); // Refresh tasks to get updates
        });

        socket.on('task-deleted', (data) => {
            setTasks(prevTasks => prevTasks.filter(task => task.id !== data.taskId));
        });

        socket.on('board-updated', (data) => {
            setBoard(data.board);
            setBoardName(data.board.name);
        });

        socket.on('member-added', (data) => {
            fetchMembers(); // Refresh members list
        });

        socket.on('member-removed', (data) => {
            fetchMembers(); // Refresh members list
        });

        socket.on('member-role-updated', (data) => {
            fetchMembers(); // Refresh members list
        });

        socket.on('user-typing', (data) => {
            if (data.userId !== user.id) {
                setTypingUsers(prev => ({
                    ...prev,
                    [data.columnId]: {
                        ...prev[data.columnId],
                        [data.userId]: {
                            username: data.username,
                            socketId: data.socketId
                        }
                    }
                }));
            }
        });

        socket.on('user-stopped-typing', (data) => {
            if (data.userId !== user.id) {
                setTypingUsers(prev => {
                    const newState = { ...prev };
                    if (newState[data.columnId]) {
                        delete newState[data.columnId][data.userId];
                        if (Object.keys(newState[data.columnId]).length === 0) {
                            delete newState[data.columnId];
                        }
                    }
                    return newState;
                });
            }
        });

        // Cleanup on unmount or when dependencies change
        return () => {
            socket.emit('leave-board', id, user.id);
            socket.disconnect();
        };
    }, [user, id]);

    // Typing indicator functions
    const handleTypingStart = (columnId) => {
        if (socketRef.current && user) {
            socketRef.current.emit('user-typing', {
                boardId: id,
                userId: user.id,
                username: user.username,
                columnId
            });
        }
    };

    const handleTypingStop = (columnId) => {
        if (socketRef.current && user) {
            socketRef.current.emit('user-stopped-typing', {
                boardId: id,
                userId: user.id,
                columnId
            });
        }
    };

    const handleTaskInputChange = (e, columnId) => {
        setNewTaskContent(e.target.value);
        
        // Handle typing indicators
        handleTypingStart(columnId);
        
        // Clear existing timeout for this column
        if (typingTimeoutRef.current[columnId]) {
            clearTimeout(typingTimeoutRef.current[columnId]);
        }
        
        // Set new timeout to stop typing indicator
        typingTimeoutRef.current[columnId] = setTimeout(() => {
            handleTypingStop(columnId);
        }, 1000);
    };

    // Existing fetch functions (unchanged)
    const fetchBoard = async () => {
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
                const foundBoard = data.boards?.find(b => b.id == id);
                if (foundBoard) {
                    setBoard(foundBoard);
                    setBoardName(foundBoard.name);
                } else {
                    setError('Board not found');
                }
            } else {
                setError(`Failed to fetch board: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to fetch board:', error);
            setError('Network error occurred while fetching board');
        }
    };

    const fetchTasks = async () => {
        try {
            const csrf_token = Cookies.get('csrf_token');
            const response = await fetch(`http://localhost:8000/api/boards/${id}/tasks`, {
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
                setTasks(data.tasks || []);
            } else {
                console.error('Failed to fetch tasks:', response.status);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    };

    const fetchMembers = async () => {
        try {
            const csrf_token = Cookies.get('csrf_token');
            const response = await fetch(`http://localhost:8000/api/boards/${id}/members`, {
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
                setMembers(data.members || []);
                
                // Find current user's role
                const currentMember = data.members?.find(member => member.user_id === user.id);
                setCurrentUserRole(currentMember?.role || null);
            } else {
                console.error('Failed to fetch members:', response.status);
            }
        } catch (error) {
            console.error('Failed to fetch members:', error);
        }
    };

    // Enhanced CRUD functions with socket emissions
    const addMember = async (e) => {
        e.preventDefault();
        if (!newMemberUsername.trim()) return;
        
        setIsAddingMember(true);
        setMemberError("");
        
        try {
            const csrf_token = Cookies.get('csrf_token');
            
            const response = await fetch(`http://localhost:8000/api/boards/${id}/members`, {
                method: 'POST',
                headers: {
                    'Accept': "application/json",
                    'Content-Type': "application/json",
                    'X-XSRF-TOKEN': csrf_token,
                },
                credentials: 'include',
                body: JSON.stringify({
                    username: newMemberUsername.trim()
                }),
            });
            
            if (response.ok) {
                const data = await response.json();
                setNewMemberUsername("");
                fetchMembers();
                setMemberError("");
                
                // Emit socket event
                if (socketRef.current) {
                    socketRef.current.emit('member-added', {
                        boardId: id,
                        member: data.member,
                        userId: user.id
                    });
                }
            } else {
                const errorData = await response.json();
                setMemberError(errorData.error || "Failed to add member");
            }
        } catch (error) {
            console.error('Failed to add member:', error);
            setMemberError("Network error occurred");
        } finally {
            setIsAddingMember(false);
        }
    };

    const removeMember = async (memberId) => {
        const isSelfRemoval = memberId === user.id;
        
        try {
            const csrf_token = Cookies.get('csrf_token');
            const response = await fetch(`http://localhost:8000/api/boards/${id}/members/${memberId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': "application/json",
                    'Content-Type': "application/json",
                    'X-XSRF-TOKEN': csrf_token,
                },
                credentials: 'include',
            });
            
            if (response.ok) {
                // Emit socket event before navigation
                if (socketRef.current) {
                    socketRef.current.emit('member-removed', {
                        boardId: id,
                        memberId,
                        userId: user.id
                    });
                }
                
                if (isSelfRemoval) {
                    navigate('/dashboard');
                } else {
                    fetchMembers();
                }
            } else {
                const errorData = await response.json();
                console.error('Failed to remove member:', errorData.error || response.status);
                alert(errorData.error || 'Failed to remove member');
            }
        } catch (error) {
            console.error('Failed to remove member:', error);
            alert('Network error occurred');
        }
    };

    const updateMemberRole = async (memberId, newRole) => {
        try {
            const csrf_token = Cookies.get('csrf_token');
            const response = await fetch(`http://localhost:8000/api/boards/${id}/members/${memberId}`, {
                method: 'PUT',
                headers: {
                    'Accept': "application/json",
                    'Content-Type': "application/json",
                    'X-XSRF-TOKEN': csrf_token,
                },
                credentials: 'include',
                body: JSON.stringify({ role: newRole }),
            });
            
            if (response.ok) {
                fetchMembers();
                
                // Emit socket event
                if (socketRef.current) {
                    socketRef.current.emit('member-role-updated', {
                        boardId: id,
                        memberId,
                        newRole,
                        userId: user.id
                    });
                }
            } else {
                console.error('Failed to update member role:', response.status);
            }
        } catch (error) {
            console.error('Failed to update member role:', error);
        }
    };

    const updateBoardName = async () => {
        if (!boardName.trim() || boardName === board?.name) return;
        
        setIsUpdatingBoard(true);
        try {
            const csrf_token = Cookies.get('csrf_token');
            const response = await fetch(`http://localhost:8000/api/boards/${id}`, {
                method: 'PUT',
                headers: {
                    'Accept': "application/json",
                    'Content-Type': "application/json",
                    'X-XSRF-TOKEN': csrf_token,
                },
                credentials: 'include',
                body: JSON.stringify({ name: boardName }),
            });
            
            if (response.ok) {
                const data = await response.json();
                setBoard(data.board);
                
                // Emit socket event
                if (socketRef.current) {
                    socketRef.current.emit('board-updated', {
                        boardId: id,
                        board: data.board,
                        userId: user.id
                    });
                }
            } else {
                console.error('Failed to update board:', response.status);
            }
        } catch (error) {
            console.error('Failed to update board:', error);
        } finally {
            setIsUpdatingBoard(false);
        }
    };

    const deleteBoard = async () => {
        if (!window.confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
            return;
        }
        
        setIsDeletingBoard(true);
        try {
            const csrf_token = Cookies.get('csrf_token');
            const response = await fetch(`http://localhost:8000/api/boards/${id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': "application/json",
                    'Content-Type': "application/json",
                    'X-XSRF-TOKEN': csrf_token,
                },
                credentials: 'include',
            });
            
            if (response.ok) {
                navigate('/dashboard');
            } else {
                console.error('Failed to delete board:', response.status);
            }
        } catch (error) {
            console.error('Failed to delete board:', error);
        } finally {
            setIsDeletingBoard(false);
        }
    };

    const createTask = async (status) => {
        if (!newTaskContent.trim()) return;
        
        setIsCreatingTask(true);
        try {
            const csrf_token = Cookies.get('csrf_token');
            const response = await fetch(`http://localhost:8000/api/boards/${id}/tasks`, {
                method: 'POST',
                headers: {
                    'Accept': "application/json",
                    'Content-Type': "application/json",
                    'X-XSRF-TOKEN': csrf_token,
                },
                credentials: 'include',
                body: JSON.stringify({
                    content: newTaskContent,
                    status: status,
                    board_id: id,
                    user_id: user.id,
                }),
            });
            
            if (response.ok) {
                const data = await response.json();
                setNewTaskContent("");
                setShowAddTask(null);
                fetchTasks();
                
                // Stop typing indicator
                handleTypingStop(status);
                
                // Emit socket event
                if (socketRef.current) {
                    socketRef.current.emit('task-created', {
                        boardId: id,
                        task: data.task,
                        userId: user.id
                    });
                }
            } else {
                console.error('Failed to create task:', response.status);
            }
        } catch (error) {
            console.error('Failed to create task:', error);
        } finally {
            setIsCreatingTask(false);
        }
    };

    const updateTaskStatus = async (taskId, newStatus) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const previousStatus = task.status;
        
        try {
            const csrf_token = Cookies.get('csrf_token');
            const response = await fetch(`http://localhost:8000/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Accept': "application/json",
                    'Content-Type': "application/json",
                    'X-XSRF-TOKEN': csrf_token,
                },
                credentials: 'include',
                body: JSON.stringify({
                    content: task.content,
                    status: newStatus
                }),
            });
            
            if (response.ok) {
                const data = await response.json();
                fetchTasks();
                
                // Emit socket event
                if (socketRef.current) {
                    socketRef.current.emit('task-updated', {
                        boardId: id,
                        task: data.task,
                        userId: user.id,
                        previousStatus
                    });
                }
            } else {
                console.error('Failed to update task:', response.status);
            }
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    };

    const deleteTask = async (taskId) => {
        try {
            const csrf_token = Cookies.get('csrf_token');
            const response = await fetch(`http://localhost:8000/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': "application/json",
                    'Content-Type': "application/json",
                    'X-XSRF-TOKEN': csrf_token,
                },
                credentials: 'include',
            });
            
            if (response.ok) {
                setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
                
                // Emit socket event
                if (socketRef.current) {
                    socketRef.current.emit('task-deleted', {
                        boardId: id,
                        taskId,
                        userId: user.id
                    });
                }
            } else {
                console.error('Failed to delete task:', response.status);
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    // Drag and drop handlers (unchanged)
    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (e, columnId) => {
        e.preventDefault();
        if (draggedTask && draggedTask.status !== columnId) {
            setDragOverColumn(columnId);
        }
    };

    const handleDragLeave = (e, columnId) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            if (dragOverColumn === columnId) {
                setDragOverColumn(null);
            }
        }
    };

    const handleDrop = (e, newStatus) => {
        e.preventDefault();
        setDragOverColumn(null);
        
        if (draggedTask && draggedTask.status !== newStatus) {
            updateTaskStatus(draggedTask.id, newStatus);
        }
        setDraggedTask(null);
    };

    const handleDragEnd = () => {
        setDraggedTask(null);
        setDragOverColumn(null);
    };

    const handleBackToDashboard = () => {
        navigate('/dashboard');
    };

    const getTasksByStatus = (status) => {
        return tasks.filter(task => task.status === status);
    };

    const canManageMembers = () => {
        return currentUserRole === 'admin';
    };

    const canEditBoard = () => {
        return currentUserRole === 'admin';
    };

    const canCreateTasks = () => {
        return currentUserRole !== 'readOnly';
    };

    const renderTypingIndicators = (columnId) => {
        const columnTyping = typingUsers[columnId];
        if (!columnTyping || Object.keys(columnTyping).length === 0) return null;

        const usernames = Object.values(columnTyping).map(user => user.username);
        const text = usernames.length === 1 
            ? `${usernames[0]} is typing...`
            : `${usernames.join(', ')} are typing...`;

        return (
            <div style={{
                fontSize: '0.7rem',
                color: '#666',
                fontStyle: 'italic',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '0.25rem',
                margin: '0.25rem 0'
            }}>
                {text}
            </div>
        );
    };

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([fetchBoard(), fetchTasks(), fetchMembers()]);
            setIsLoading(false);
        };
        loadData();
    }, [id]);

    if (isLoading) {
        return (
            <div className={styles.board}>
                <div className={styles.loading}>Loading board...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.board}>
                <div className={styles.header}>
                    <button onClick={handleBackToDashboard} className={styles.backButton}>
                        ← Back to Dashboard
                    </button>
                </div>
                <div className={styles.error}>
                    {error}
                    <button onClick={() => window.location.reload()} style={{marginLeft: '10px'}}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.board}>
            {showSidebar && (
                <div className={styles.sidebar}>
                    <div className={styles.container}>
                        <div className={styles.members}>
                            <h3>
                                Members
                                <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '0.5rem' }}>
                                    ({onlineCount} online)
                                </span>
                                <button onClick={() => setShowSidebar(false)}>&#10006;</button>    
                            </h3>
                            
                            {canManageMembers() && (
                                <form onSubmit={addMember}>
                                    <input 
                                        type="text" 
                                        name="username" 
                                        placeholder="Enter username"
                                        value={newMemberUsername}
                                        onChange={(e) => setNewMemberUsername(e.target.value)}
                                        disabled={isAddingMember}
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={isAddingMember || !newMemberUsername.trim()}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            marginTop: '0.5rem',
                                            backgroundColor: '#2980b9',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.3rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {isAddingMember ? 'Adding...' : 'Add Member'}
                                    </button>
                                    {memberError && (
                                        <div style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                            {memberError}
                                        </div>
                                    )}
                                </form>
                            )}

                        {members.map(member => (
                            <div key={member.user_id} className={styles.member}>
                                <p className={styles.username}>
                                    {member.username}
                                    {member.user_id === user.id && <span style={{color: '#888', fontSize: '0.8em'}}> (You)</span>}
                                </p>
                                <div className={styles.info}>
                                    <select 
                                        name="role" 
                                        value={member.role}
                                        onChange={(e) => updateMemberRole(member.user_id, e.target.value)}
                                        disabled={!canManageMembers() || member.user_id === user.id}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="member">Write</option>
                                        <option value="readOnly">ReadOnly</option>
                                    </select>
                                    {canManageMembers() && member.user_id !== user.id && (
                                        <button 
                                            onClick={() => removeMember(member.user_id)}
                                            title="Remove member"
                                            style={{
                                                background: '#e74c3c',
                                                color: 'white',
                                                border: 'none',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            &#10006;
                                        </button>
                                    )}
                                    {member.user_id === user.id && (
                                        <button 
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to leave this board?')) {
                                                    removeMember(member.user_id);
                                                }
                                            }}
                                            title="Leave board"
                                            style={{
                                                background: '#f39c12',
                                                color: 'white',
                                                border: 'none',
                                                padding: '2px 8px',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '0.8em'
                                            }}
                                        >
                                            Leave
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        </div>

                        <div className={styles.boardSettings}>
                            <input 
                                type="text" 
                                name="name" 
                                value={boardName}
                                onChange={(e) => setBoardName(e.target.value)}
                                disabled={!canEditBoard() || isUpdatingBoard}
                                onBlur={updateBoardName}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        updateBoardName();
                                    }
                                }}
                            />
                            {canEditBoard() && (
                                <button 
                                    onClick={deleteBoard}
                                    disabled={isDeletingBoard}
                                >
                                    {isDeletingBoard ? 'Deleting...' : 'Delete Board'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.left}>
                        <button onClick={handleBackToDashboard} className={styles.backButton}>
                            ← Back to Dashboard
                        </button>
                        <h1>{board?.name || 'Board'}</h1>
                    </div>
                    <div className={styles.right}>
                        <button onClick={() => setShowSidebar(prev => !prev)}>
                            <img src="/side.svg" width="26px" />
                        </button>
                        <button onClick={() => dispatch(logoutUser())} style={{
                            width: "35px",
                            height: "35px",
                            borderRadius: "50%",
                            marginLeft: "1rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#f7f7f7"
                        }}>
                            <img src="/logout.svg" width="17px" />
                        </button>
                    </div>
                </div>
            
                <div className={styles.kanbanBoard}>
                    {columns.map(column => (
                        <div 
                            key={column.id} 
                            className={`${styles.column} ${dragOverColumn === column.id ? styles.dragOver : ''}`}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, column.id)}
                            onDragLeave={(e) => handleDragLeave(e, column.id)}
                            onDrop={(e) => handleDrop(e, column.id)}
                            style={{ backgroundColor: column.color }}
                        >
                            <div className={styles.columnHeader}>
                                <h3>{column.title}</h3>
                                <span className={styles.taskCount}>
                                    {getTasksByStatus(column.id).length}
                                </span>
                                {canCreateTasks() && (
                                    <button 
                                        className={styles.addTaskButton}
                                        onClick={() => setShowAddTask(column.id)}
                                    >
                                        +
                                    </button>
                                )}
                            </div>

                            <div className={styles.tasksContainer}>
                                {/* Show placeholder at the top if dragging over this column */}
                                {dragOverColumn === column.id && draggedTask && draggedTask.status !== column.id && (
                                    <div className={styles.dragPlaceholder}>
                                        <div className={styles.placeholderContent}>
                                            Drop "{draggedTask.content.substring(0, 30)}..." here
                                        </div>
                                    </div>
                                )}

                                {getTasksByStatus(column.id).map(task => (
                                    <div
                                        key={task.id}
                                        className={`${styles.task} ${draggedTask && draggedTask.id === task.id ? styles.dragging : ''}`}
                                        draggable={canCreateTasks()}
                                        onDragStart={(e) => handleDragStart(e, task)}
                                        onDragEnd={handleDragEnd}>
                                        <div className={styles.taskContent}>
                                            {task.content}
                                        </div>
                                        <div className={styles.taskMeta}>
                                            <span className={styles.taskAuthor}>
                                                @{task.username}
                                            </span>
                                            {canCreateTasks() && (
                                                <button 
                                                    className={styles.deleteTask}
                                                    onClick={() => deleteTask(task.id)}
                                                    title="Delete task"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Typing indicators */}
                                {renderTypingIndicators(column.id)}

                                {showAddTask === column.id && canCreateTasks() && (
                                    <div className={styles.addTaskForm}>
                                        <textarea
                                            value={newTaskContent}
                                            onChange={(e) => handleTaskInputChange(e, column.id)}
                                            placeholder="Enter task description..."
                                            className={styles.taskInput}
                                            rows="3"
                                            autoFocus
                                        />
                                        <div className={styles.addTaskActions}>
                                            <button 
                                                onClick={() => createTask(column.id)}
                                                disabled={isCreatingTask || !newTaskContent.trim()}
                                                className={styles.saveTask}
                                            >
                                                {isCreatingTask ? 'Adding...' : 'Add Task'}
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setShowAddTask(null);
                                                    setNewTaskContent("");
                                                    handleTypingStop(column.id);
                                                }}
                                                className={styles.cancelTask}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Board;