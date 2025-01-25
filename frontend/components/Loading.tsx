'use client';

import React from 'react';

interface LoadingProps {
    fadeOut: boolean;
}


const Loading: React.FC<LoadingProps> = ({ fadeOut }) => {
    return (
        <div className={`loading ${fadeOut ? 'fade-out' : ''}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff', backgroundColor: 'black' }}>
            <div className="loader"></div>
        </div>
    );
};

export default Loading;
