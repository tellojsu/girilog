import { LineItem, Client } from '@/types/girilog';

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  client?: Client | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function LineItemsEditor({ items, onChange, client }: LineItemsEditorProps) {
  const showDate = client?.show_date ?? false;
  const showProject = client?.show_project ?? false;
  const projects = client?.projects ?? [];

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const newItem = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const q = field === 'quantity' ? (parseFloat(value) || 0) : item.quantity;
        const p = field === 'unit_price' ? (parseFloat(value) || 0) : item.unit_price;
        newItem.amount = q * p;
        newItem[field] = parseFloat(value) || 0;
      }
      return newItem;
    });
    onChange(updated);
  };

  const addItem = () => {
    onChange([...items, {
      description: '',
      quantity: 1,
      unit_price: client?.default_hourly_rate ?? 0,
      amount: client?.default_hourly_rate ?? 0,
      date: new Date().toISOString().split('T')[0],
      project: projects.length > 0 ? projects[0] : null
    }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  // Calculate column spans
  // Total 12 cols.
  // We distribute them based on visibility of optional columns.
  let descSpan = 8;
  if (showDate) descSpan -= 2;
  if (showProject) descSpan -= 2;

  // Use a map for Tailwind col-span classes to ensure they are picked up by the compiler
  const spanMap: { [key: number]: string } = {
    4: 'col-span-4',
    6: 'col-span-6',
    8: 'col-span-8'
  };

  const descSpanClass = spanMap[descSpan] || 'col-span-8';

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 mb-2">
        {showDate && <div className="col-span-2 text-[10px] text-[#6B7280] font-mono uppercase tracking-wider">Date</div>}
        {showProject && <div className="col-span-2 text-[10px] text-[#6B7280] font-mono uppercase tracking-wider">Project</div>}
        <div className={`${descSpanClass} text-[10px] text-[#6B7280] font-mono uppercase tracking-wider`}>Description</div>
        <div className="col-span-1 text-[10px] text-[#6B7280] font-mono uppercase tracking-wider text-right">Qty</div>
        <div className="col-span-1 text-[10px] text-[#6B7280] font-mono uppercase tracking-wider text-right">Price</div>
        <div className="col-span-2 text-[10px] text-[#6B7280] font-mono uppercase tracking-wider text-right">Total</div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center group">
            {showDate && (
              <div className="col-span-2">
                <input
                  type="date"
                  value={item.date || ''}
                  onChange={e => updateItem(index, 'date', e.target.value)}
                  className="w-full bg-[#1E2330] border border-[#2A3040] rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:border-primary/50 transition-colors font-mono"
                />
              </div>
            )}
            {showProject && (
              <div className="col-span-2">
                <select
                  value={item.project || ''}
                  onChange={e => updateItem(index, 'project', e.target.value)}
                  className="w-full bg-[#1E2330] border border-[#2A3040] rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none truncate"
                >
                  <option value="">No Project</option>
                  {projects.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={descSpanClass}>
              <input
                type="text"
                value={item.description}
                onChange={e => updateItem(index, 'description', e.target.value)}
                placeholder="Item description..."
                className="w-full bg-[#1E2330] border border-[#2A3040] rounded-lg px-3 py-2 text-[11px] text-white placeholder-secondary focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="col-span-1">
              <input
                type="number"
                value={item.quantity}
                onChange={e => updateItem(index, 'quantity', e.target.value)}
                min="0"
                step="0.5"
                className="w-full bg-[#1E2330] border border-[#2A3040] rounded-lg px-1 py-2 text-[11px] text-white font-mono text-right focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="col-span-1">
              <div className="relative">
                <input
                  type="number"
                  value={item.unit_price}
                  onChange={e => updateItem(index, 'unit_price', e.target.value)}
                  step="0.01"
                  className={`w-full bg-[#1E2330] border border-[#2A3040] rounded-lg px-2 py-2 text-[11px] font-mono text-right focus:outline-none focus:border-primary/50 transition-colors ${item.unit_price < 0 ? 'text-danger' : 'text-white'}`}
                />
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-end gap-1">
              <span className={`text-[12px] font-mono font-semibold truncate ${item.amount < 0 ? 'text-danger' : 'text-white'}`}>
                {formatCurrency(item.amount)}
              </span>
              <button
                onClick={() => removeItem(index)}
                className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-secondary hover:text-[#EF4444] transition-all cursor-pointer rounded"
              >
                <i className="ri-close-line text-sm" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item */}
      <button
        onClick={addItem}
        className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-[#34D399] font-mono transition-colors cursor-pointer whitespace-nowrap"
      >
        <div className="w-4 h-4 flex items-center justify-center">
          <i className="ri-add-line text-sm" />
        </div>
        Add line item
      </button>
    </div>
  );
}
