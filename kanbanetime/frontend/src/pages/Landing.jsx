import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Landing.module.css';

const splitTextElement = function (element) {
    const text = element.textContent;
    const letters = text.split('');
    element.innerHTML = '';
    for (let i = 0; i < letters.length; i++) {
        element.insertAdjacentHTML('beforeend', `<span>${letters[i]}</span>`);
    }
};

const animateLetterByLetter = function (element) {
    splitTextElement(element);
    const letters = element.querySelectorAll('span');
    letters.forEach((letter, index) => {
        letter.style.opacity = '0';
        letter.style.transform = 'translateY(20px)';
        letter.style.filter = 'blur(4px)';
        letter.style.display = 'inline-block';
        letter.style.transition = `all 0.4s ease ${index * 0.05}s`;

        setTimeout(() => {
            letter.style.opacity = '1';
            letter.style.transform = 'translateY(0)';
            letter.style.filter = 'blur(0)';
        }, 50);
    });
};

const Landing = function () {
    const titleRef = useRef(null);

    useEffect(() => {
        if (titleRef.current) {
            animateLetterByLetter(titleRef.current);
        }
    }, []);

    return (
        <div className={styles.viewport}>
            <div className={styles.container}>
                <h1>
                    <img src="/logo.svg" width="100px" alt="Logo" />
                    <span ref={titleRef}>Kantime</span>
                </h1>
                <h3>
                    A Simple <span>Realtime</span> Kanban Board for Teams
                </h3>
                <div className={styles.buttons}>
                    <Link to="/signup">Signup</Link>
                    <Link to="/login">Login</Link>
                </div>
            </div>
        </div>
    );
};

export default Landing;
