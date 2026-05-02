import { ProductResult } from "../services/api";

interface PairingCardProps {
  product: ProductResult;
}

export function PairingCard({ product }: PairingCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-full" data-testid={`pairing-card-${product.id}`}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground border border-border px-2 py-0.5 rounded-full">
          {product.category}
        </span>
      </div>
      
      <h3 className="text-xl font-serif leading-tight mb-3 text-foreground">{product.name}</h3>
      
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Tasting Notes</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {product.flavorNotes.slice(0, 3).map((note) => (
          <span key={note} className="px-2 py-0.5 text-[10px] rounded-sm bg-secondary text-secondary-foreground">
            {note}
          </span>
        ))}
        {product.flavorNotes.length > 3 && (
          <span className="px-2 py-0.5 text-[10px] rounded-sm bg-secondary text-secondary-foreground">
            +{product.flavorNotes.length - 3}
          </span>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-border">
         <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Pairs beautifully with</p>
         <p className="text-xs italic text-primary">{product.pairingTags.slice(0, 2).join(", ")}</p>
      </div>
    </div>
  );
}
