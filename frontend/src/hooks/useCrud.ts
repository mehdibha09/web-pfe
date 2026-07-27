import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/errorMessage';

interface UseCrudOptions<T> {
    listFn: () => Promise<T[]>;
    createFn?: (data: any) => Promise<any>;
    updateFn?: (id: string, data: any) => Promise<any>;
    deleteFn?: (id: string) => Promise<any>;
    entityName: string;
    loadOnMount?: boolean;
}

export function useCrud<T extends { id: string }>({
    listFn,
    createFn,
    updateFn,
    deleteFn,
    entityName,
    loadOnMount = true
}: UseCrudOptions<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listFn();
            setItems(data);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, `Failed to load ${entityName}`));
        } finally {
            setLoading(false);
        }
    }, [listFn, entityName]);

    useEffect(() => {
        if (loadOnMount) {
            load();
        }
    }, [load, loadOnMount]);

    const handleCreate = useCallback(
        async (data: any, resetForm?: () => void) => {
            if (!createFn) return;
            setCreating(true);
            try {
                await createFn(data);
                toast.success(`${entityName} created`);
                resetForm?.();
                await load();
            } catch (e: unknown) {
                toast.error(getErrorMessage(e, `Failed to create ${entityName}`));
            } finally {
                setCreating(false);
            }
        },
        [createFn, entityName, load]
    );

    const handleUpdate = useCallback(
        async (id: string, data: any, onSuccess?: () => void) => {
            if (!updateFn) return;
            setSaving(true);
            try {
                await updateFn(id, data);
                toast.success(`${entityName} updated`);
                onSuccess?.();
                await load();
            } catch (e: unknown) {
                toast.error(getErrorMessage(e, `Failed to update ${entityName}`));
            } finally {
                setSaving(false);
            }
        },
        [updateFn, entityName, load]
    );

    const handleDelete = useCallback(
        async (id: string, confirm = true) => {
            if (!deleteFn) return;
            if (confirm && !window.confirm(`Delete this ${entityName.toLowerCase()}?`)) return;
            try {
                await deleteFn(id);
                toast.success(`${entityName} deleted`);
                await load();
            } catch (e: unknown) {
                toast.error(getErrorMessage(e, `Failed to delete ${entityName}`));
            }
        },
        [deleteFn, entityName, load]
    );

    return {
        items,
        setItems,
        loading,
        creating,
        saving,
        load,
        handleCreate,
        handleUpdate,
        handleDelete
    };
}
