import React, { useId } from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Textarea({ className, ...props }: Props) {
  const autoId = useId();
  const id = props.id ?? autoId;
  const name = props.name ?? id;
  return (
    <textarea
      id={id}
      name={name}
      className={cn(
        "w-full rounded-xl bg-slate-900/60 border border-white/10 p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/60",
        className
      )}
      {...props}
    />
  );
}
