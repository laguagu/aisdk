'use client';

import { useState } from 'react';
import { generate } from '@/app/actions';
import { readStreamableValue } from 'ai/rsc';

export default function Home() {
  const [generation, setGeneration] = useState<string>('');

  return (
    <div>
      <button
        onClick={async () => {
          const { object } = await generate('Messages during finals week.');

          for await (const partialObject of readStreamableValue(object)) {
            if (partialObject) {
              setGeneration(
                JSON.stringify(partialObject.notifications, null, 2),
              );
            }
          }
        }}
      >
        Ask
      </button>

      <pre>{generation}</pre>
    </div>
  );
}