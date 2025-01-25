'use client';

import React from 'react';

interface LoadingProps {
    fadeOut: boolean;
}

import Image from 'next/image';
import logo from '/public/logo.svg';

const Loading: React.FC<LoadingProps> = ({ fadeOut }) => {
    return (
        <div className={`loading ${fadeOut ? 'fade-out' : ''}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff', backgroundColor: 'black' }}>
            <Image src={logo} alt="Logo" style={{ marginBottom: '10px' }} />
            <div className="loader"></div>
        </div>
    );
};

export default Loading;
