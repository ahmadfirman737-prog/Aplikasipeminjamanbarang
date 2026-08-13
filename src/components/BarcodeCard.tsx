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
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          lineColor: '#074A69',
          width: 1.8,
          height: 38,
          displayValue: false,
          margin: 0
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [code]);

  return <svg ref={svgRef} className={className}></svg>;
};
