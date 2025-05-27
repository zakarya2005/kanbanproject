import { useNavigate } from 'react-router-dom';
import styles from '../styles/NotFound.module.css';

const NotFound = function() {

    const navigate = useNavigate();

    return (
        <>
            <div className={styles.container}>
                <div className={styles.element}>
                    <h1>404</h1>
                    <button onClick={() => {
                        navigate('/dashboard');
                    }}><img src="/arrow.svg" width="20px" /></button>
                </div>
            </div>
        </>
    );
}

export default NotFound;