import React from 'react';
import { UI } from './Icons';

class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) {
        console.error("Error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-100 p-8">
                    <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full border border-red-200">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <UI.Alert size={32} />
                            <h2 className="text-xl font-black">應用程式發生錯誤</h2>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border font-mono text-xs text-red-800 overflow-auto max-h-60 mb-4 whitespace-pre-wrap">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>
                        <button onClick={() => window.location.reload()} className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
                            重新整理頁面
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
