import { Link } from 'react-router-dom';

export default function Logo({ className = "text-3xl", onClick }) {
    return (
        <div 
            onClick={onClick}
            className={`font-display font-black italic tracking-tighter select-none flex items-center gap-2 transition-transform hover:scale-105 duration-300 ${className}`}
        >
            <span 
                className="text-white" 
                style={{ 
                    textShadow: "-2px 0px 0px #06b6d4, 2px 0px 0px #ef4444" 
                }}
            >
                Event
            </span>
            <span 
                className="text-indigo-500"
                style={{
                    textShadow: "-2px 0px 0px #1e1b4b"
                }}
            >
                Hub
            </span>
        </div>
    );
}
