import { useState } from 'react';
import { useCultivars } from '@/hooks/useCultivars';
import { addCultivar, updateCultivar, deleteCultivar } from '@/lib/cultivar-service';
import { CultivarTable } from '@/components/admin/CultivarTable';
import { CultivarForm } from '@/components/admin/CultivarForm';
import type { CultivarDoc, CultivarForm as CultivarFormType } from '@/types/cultivar';

type View = { mode: 'list' } | { mode: 'add' } | { mode: 'edit'; cultivar: CultivarDoc & { id: string } };

export function AdminPage() {
  const { cultivars, loading, error, refresh } = useCultivars();
  const [view, setView] = useState<View>({ mode: 'list' });

  async function handleAdd(data: CultivarFormType) {
    await addCultivar(data);
    await refresh();
    setView({ mode: 'list' });
  }

  async function handleUpdate(data: CultivarFormType) {
    if (view.mode !== 'edit') return;
    await updateCultivar(view.cultivar.id, data);
    await refresh();
    setView({ mode: 'list' });
  }

  async function handleDelete(id: string) {
    await deleteCultivar(id);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Admin — Cultivars</h1>
        {view.mode === 'list' && (
          <button
            onClick={() => setView({ mode: 'add' })}
            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            + Add Cultivar
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
      )}

      {view.mode === 'list' && (
        loading ? (
          <p className="text-gray-500 py-8 text-center">Loading…</p>
        ) : (
          <CultivarTable
            cultivars={cultivars}
            onEdit={(c) => setView({ mode: 'edit', cultivar: c })}
            onDelete={handleDelete}
          />
        )
      )}

      {view.mode === 'add' && (
        <CultivarForm
          onSubmit={handleAdd}
          onCancel={() => setView({ mode: 'list' })}
        />
      )}

      {view.mode === 'edit' && (
        <CultivarForm
          initial={view.cultivar}
          isEdit
          onSubmit={handleUpdate}
          onCancel={() => setView({ mode: 'list' })}
        />
      )}
    </div>
  );
}
