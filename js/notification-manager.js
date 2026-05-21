// ===================================
// NOTIFICATION MANAGER
// Handles toast notifications and modals
// ===================================

class NotificationManager {
    constructor() {
        this.toastQueue = [];
        this.isToastShowing = false;
    }

    // Show toast notification
    showToast(msg, type = 'info') {
        this.toastQueue.push({ msg, type });
        this.processToastQueue();
    }

    // Process toast queue
    processToastQueue() {
        if (this.isToastShowing || this.toastQueue.length === 0) return;

        this.isToastShowing = true;
        const { msg, type } = this.toastQueue.shift();

        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMessage');
        const icon = toast.querySelector('.toast-icon');

        toastMsg.textContent = msg;
        toast.className = `toast show type-${type}`;

        // Set icon color
        if (type === 'error') icon.style.color = 'var(--error)';
        else if (type === 'success') icon.style.color = 'var(--success)';
        else icon.style.color = 'var(--primary-500)';

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                this.isToastShowing = false;
                this.processToastQueue();
            }, 300);
        }, 3000);
    }

    // Show confirmation modal
    showConfirmModal(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            modal.querySelector('h3').textContent = title;
            document.getElementById('confirmMessage').textContent = message;

            modal.style.display = 'flex';

            const handleOk = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                modal.style.display = 'none';
                document.getElementById('confirmOk').removeEventListener('click', handleOk);
                document.getElementById('confirmCancel').removeEventListener('click', handleCancel);
            };

            document.getElementById('confirmOk').addEventListener('click', handleOk);
            document.getElementById('confirmCancel').addEventListener('click', handleCancel);
        });
    }

    // Show loading overlay
    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    // Hide loading overlay
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}
