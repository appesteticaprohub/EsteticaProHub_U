'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface SearchParamsWrapperProps {
  children: (searchParams: URLSearchParams | null) => React.ReactNode;
}

function SearchParamsProvider({ children }: SearchParamsWrapperProps) {
  const searchParams = useSearchParams();
  return <>{children(searchParams)}</>;
}

export default function SearchParamsWrapper({ children }: SearchParamsWrapperProps) {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <SearchParamsProvider>{children}</SearchParamsProvider>
    </Suspense>
  );
}