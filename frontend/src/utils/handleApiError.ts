import { toast } from 'react-toastify';
import { getErrorMessage } from './errorMessage';

export const handleApiError = (error: unknown, fallback: string) => {
    const err = error as { response?: { status?: number } };
    const status = err?.response?.status;

    if (status === 401) {
        toast.error('Session expirée — veuillez vous reconnecter');
        return;
    }

    toast.error(getErrorMessage(error, fallback));
};
