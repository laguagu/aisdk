"use client";

import React, { useState, useEffect } from "react";
import { Payment } from "../columns";
// Oletetaan, että meillä on funktio, joka hakee käyttäjän tiedot id:n perusteella
async function fetchUser(id: string): Promise<Payment> {
  // Tässä on esimerkki, korvaa tämä todellisella koodilla
  return {
    id: "728ed52f",
    amount: 100,
    status: "pending",
    email: "john.doe@example.com",
    alyaHankeMaksu: false,
  };
}

// Oletetaan, että meillä on funktio, joka päivittää käyttäjän tiedot
async function updateUser(user: Payment): Promise<void> {
  // Tässä on esimerkki, korvaa tämä todellisella koodilla
  console.log("Updating user", user);
}

export default function Page({ params }: { params?: { id?: string } }) {
  const [user, setUser] = useState<Payment | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchUser(params.id).then(setUser);
    }
  }, [params?.id]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    console.log(name, value);
    
    setUser((prevUser) => ({ ...prevUser, [name]: value } as Payment));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (user) {
      updateUser(user);
    }
  };

  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h1 className="text-2xl font-bold mb-4">
        Hello user id {params?.id}
      </h1>
      {user && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="email"
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={user.email}
              onChange={handleChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="amount"
            >
              Amount
            </label>
            <input
              type="number"
              name="amount"
              id="amount"
              value={user.amount}
              onChange={handleChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Update
          </button>
        </form>
      )}
    </div>
  );
}
