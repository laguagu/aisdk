'use client';

import { useState } from 'react';
import { getNotifications, getRecipe } from './actions';

export default function Home() {
  const [generation, setGeneration] = useState<string>('');

  return (
    <div>
      <button
        onClick={async () => {
          const { notifications } = await getNotifications(
            // 'Messages during finals week.', // for getNotifications function
            'Generate a lasagna recipe.', // for getRecipe function 
          );

          setGeneration(JSON.stringify(notifications, null, 2));
        }}
      >
        View Notifications
      </button>

      <pre>{generation}</pre>
    </div>
  );
}