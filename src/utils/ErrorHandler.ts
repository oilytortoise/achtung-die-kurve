export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorQueue: string[] = [];
    private isShowingError = false;

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    public showError(message: string, duration: number = 5000): void {
        this.errorQueue.push(message);
        if (!this.isShowingError) {
            this.processErrorQueue(duration);
        }
    }

    public showNetworkError(error: string | Error): void {
        const message = typeof error === 'string' ? error : error.message;
        this.showError(`Network Error: ${message}`, 7000);
    }

    public showConnectionLost(): void {
        this.showError('Connection lost. Attempting to reconnect...', 10000);
    }

    public showReconnected(): void {
        this.showError('Reconnected to server!', 3000);
    }

    public showGameInterrupted(): void {
        this.showError('Game was interrupted due to connection issues. Returning to lobby...', 5000);
    }

    private async processErrorQueue(duration: number): Promise<void> {
        while (this.errorQueue.length > 0) {
            this.isShowingError = true;
            const message = this.errorQueue.shift();
            
            if (message) {
                await this.displayError(message, duration);
            }
        }
        this.isShowingError = false;
    }

    private displayError(message: string, duration: number): Promise<void> {
        return new Promise((resolve) => {
            // Create or update error toast
            let errorToast = document.getElementById('error-toast');
            
            if (!errorToast) {
                errorToast = document.createElement('div');
                errorToast.id = 'error-toast';
                errorToast.className = 'error-toast';
                document.body.appendChild(errorToast);
                
                // Add CSS if not already added
                this.addErrorToastStyles();
            }

            errorToast.textContent = message;
            errorToast.classList.add('show');

            setTimeout(() => {
                errorToast?.classList.remove('show');
                setTimeout(() => {
                    resolve();
                }, 300); // Wait for fade out animation
            }, duration);
        });
    }

    private addErrorToastStyles(): void {
        const styleId = 'error-toast-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .error-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f44336;
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                max-width: 300px;
                word-wrap: break-word;
            }
            
            .error-toast.show {
                opacity: 1;
                transform: translateX(0);
            }
        `;
        document.head.appendChild(style);
    }

    public clearErrors(): void {
        this.errorQueue = [];
        const errorToast = document.getElementById('error-toast');
        if (errorToast) {
            errorToast.classList.remove('show');
        }
    }
}

export const errorHandler = ErrorHandler.getInstance();
