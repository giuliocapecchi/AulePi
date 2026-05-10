'use client';

import React from 'react';
import Image from 'next/image';

interface LoadingProps {
    fadeOut: boolean;
}

const Loading: React.FC<LoadingProps> = ({ fadeOut }) => {
    return (
        <div className={`loading ${fadeOut ? 'fade-out' : ''}`}
             style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                backgroundColor: 'black',
                transition: 'opacity 0.3s ease-in-out'
             }}>
            {/* immediately load the logo */}
            <div className="mb-8">
                <Image
                    src="/logo.png"
                    width={120}
                    height={120}
                    alt="AulePi Logo"
                    priority
                    className="animate-pulse"
                />
            </div>
            <div className="loader"></div>
            <p className="mt-4 text-sm opacity-70">Loading...</p>
        </div>
    );
};

export default Loading;
