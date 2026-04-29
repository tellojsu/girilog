import { LineItem } from '@/types/girilog';

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const newItem = { ...item, [field]: field === 'description' ? value : parseFloat(value) || 0 };
      newItem.amount = newItem.quantity * newItem.unit_price;
      return newItem;
    });
    onChange(updated);
  };

  const addItem = () => {
    onChange([...items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 mb-2 px-1">
        <div className="col-span-5 text-xs text-[#6B7280] font-mono uppercase tracking-wider">Description</div>
        <div className="col-span-2 text-xs text-[#6B7280] font-mono uppercase tracking-wider">Qty</div>
        <div className="col-span-3 text-xs text-[#6B7280] font-mono uppercase tracking-wider">Unit Price</div>
        <div className="col-span-2 text-xs text-[#6B7280] font-mono uppercase tracking-wider text-right">Amount</div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center group">
            <div className="col-span-5">
              <input
                type="text"
                value={item.description}
                onChange={e => updateItem(index, 'description', e.target.value)}
                placeholder="Item description..."
                className="w-full bg-[#1E2330] border border-[#2A3040] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#10B981]/50 transition-colors"
              />
            </div>
            <div className="col-span-2">
              <input
                type="number"
                value={item.quantity}
                onChange={e => updateItem(index, 'quantity', e.target.value)}
                min="0"
                step="0.5"
                className="w-full bg-[#1E2330] border border-[#2A3040] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#10B981]/50 transition-colors"
              />
            </div>
            <div className="col-span-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563] text-sm font-mono">$</span>
                <input
                  type="number"
                  value={item.unit_price}
                  onChange={e => updateItem(index, 'unit_price', e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full bg-[#1E2330] border border-[#2A3040] rounded-lg pl-6 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#10B981]/50 transition-colors"
                />
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-end gap-2">
              <span className="text-sm font-mono font-semibold text-white">{formatCurrency(item.amount)}</span>
              <button
                onClick={() => removeItem(index)}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-[#4B5563] hover:text-[#EF4444] transition-all cursor-pointer rounded"
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
        className="mt-3 flex items-center gap-2 text-sm text-[#10B981] hover:text-[#34D399] font-mono transition-colors cursor-pointer whitespace-nowrap"
      >
        <div className="w-4 h-4 flex items-center justify-center">
          <i className="ri-add-line text-sm" />
        </div>
        Add line item
      </button>
    </div>
  );
}
