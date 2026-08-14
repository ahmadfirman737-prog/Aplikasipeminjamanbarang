import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeCardProps {
  code: string;
  className?: string;
}

export const BarcodeCard: React.FC<BarcodeCardProps> = ({ code, className = '' }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        const cleanCode = String(code).trim().toUpperCase();
        JsBarcode(svgRef.current, cleanCode, {
          format: 'CODE128',
          lineColor: '#000000', // standard black for highest optical reader contrast
          width: 2,
          height: 44,
          displayValue: false,
          margin: 6,
          background: '#ffffff'
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [code]);

  return <svg ref={svgRef} className={className}></svg>;
};

