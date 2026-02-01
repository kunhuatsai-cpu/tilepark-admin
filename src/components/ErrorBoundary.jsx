import React from 'react';
import { UI } from './Icons';

class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("Error:", error, errorInfo); }
    render() {
        if (this.state.hasError) return <div className="p-10 text-center"><UI.Alert className="text-red-500 mx-auto mb-2" />錯誤</div>;
        return this.props.children;
    }
}

export default ErrorBoundary;
