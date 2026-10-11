import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  mobileCardRender?: (item: T) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  mobileCardRender,
  emptyMessage = 'No records found.',
  className = '',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-gray-500 bg-white border border-ivory-300 rounded-2xl">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-ivory-300 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-ivory-100/90 border-b border-ivory-200 text-forest-950 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`p-3.5 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200 font-medium text-gray-700">
            {data.map((item) => (
              <tr key={keyExtractor(item)} className="hover:bg-ivory-50/80 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`p-3.5 ${col.className || ''}`}>
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile-Friendly Cards */}
      <div className="sm:hidden space-y-3">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            className="p-4 bg-white border border-ivory-300 rounded-2xl shadow-sm space-y-2.5"
          >
            {mobileCardRender
              ? mobileCardRender(item)
              : columns.map((col) => (
                  <div key={col.key} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-400 uppercase text-[10px]">
                      {col.header}
                    </span>
                    <span className="font-semibold text-gray-800">
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </span>
                  </div>
                ))}
          </div>
        ))}
      </div>
    </div>
  );
}
