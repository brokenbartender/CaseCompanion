import React, { useId } from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...props }: Props) {
  const autoId = useId();
  const id = props.id ?? autoId;
  const name = props.name ?? id;
  return (
    <input
      id={id}
      name={name}
      className={cn(
        "h-10 w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/60",
        className
      )}
      {...props}
    />
  );
}
