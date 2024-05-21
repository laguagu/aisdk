"use client";

import { useState } from "react";
import { getNotifications, getRecipe } from "./actions";
import { useForm } from "react-hook-form";
import { invokeLangChain } from "@/lib/langchainActions";
import React from "react";

export type DefaultValues = {
  name: string;
  message: string;
  minutesAgo: number;
};

function MyForm({ defaultValues }: { defaultValues: object }) {
  const { register, handleSubmit, reset } = useForm<DefaultValues>({
    defaultValues,
  });
  console.log(defaultValues);

  const onSubmit = (data: any) => console.log(data);

  const handleReset = () => {
    // Reset the form fields to empty or default values
    reset({
      name: "",
      message: "",
      minutesAgo: 0,
    });
  };

  // Reset form with received data
  React.useEffect(() => {
    reset(defaultValues);
  }, [reset, defaultValues]);

  return (
    <div className="p-20">
      <div className="flex">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex gap-3 flex-col items-start"
        >
          <input {...register("name")} placeholder="Name" />
          <input {...register("message")} placeholder="Message" />
          <input {...register("minutesAgo")} placeholder="Minutes Ago" />
          <input type="submit" className="border flex-none w-auto" value={"Lokita arvot"}/>
        </form>
      </div>
      <button onClick={handleReset}>Reset values</button>s
    </div>
  );
}

export default function Home() {
  const [formData, setFormData] = useState<object>({});

  const handleLangChain = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const result = await invokeLangChain(null);
    console.log(result);
  }

  const handleClick = async () => {
    const result = await getNotifications(
      "Generate a notification for a messages app."
    );
    const notifications = result.notifications;
    if (notifications.length > 0) {
      setFormData(notifications[0]);
    }
  };

  return (
    <div>
      <button onClick={handleClick}>Täydennä lomake</button>
      <MyForm defaultValues={formData} />
      {/* <pre>{formData}</pre> */}
      <button onClick={handleLangChain}>LangChain invoke</button>
    </div>
  );
}
