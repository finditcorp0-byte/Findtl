"use client";

import { useState } from "react";
import { createInstitution } from "@/app/actions/createInstitution";

export default function CreateInstitutionForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("CO");
  const [emailDomain, setEmailDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await createInstitution({
      name,
      slug,
      city,
      country,
      email_domain: emailDomain,
    });

    if (result.success) {
      setMessage({ type: "success", text: "Universidad registrada correctamente." });
      setName("");
      setSlug("");
      setCity("");
      setCountry("CO");
      setEmailDomain("");
    } else {
      setMessage({ type: "error", text: result.error ?? "Error desconocido." });
    }
    setLoading(false);
  };

  return (
    <section className="mt-10 rounded-[1.25rem] border border-line bg-white p-6 shadow-soft">
      <h2 className="text-[1.35rem] font-semibold text-ink">Registrar nueva universidad</h2>
      <p className="mt-1 text-[14px] text-muted">
        Solo administradores globales pueden crear nuevas instituciones (tenants).
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-[14px] font-semibold text-ink" htmlFor="inst-name">
            Nombre
          </label>
          <input
            id="inst-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink focus:border-forest-500 focus:outline-none"
            placeholder="Universidad Ejemplo"
          />
        </div>

        <div>
          <label className="block text-[14px] font-semibold text-ink" htmlFor="inst-slug">
            Slug (identificador único)
          </label>
          <input
            id="inst-slug"
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink focus:border-forest-500 focus:outline-none"
            placeholder="uni-ejemplo"
          />
          <p className="mt-1 text-[12px] text-muted">Solo letras minúsculas, números y guiones.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[14px] font-semibold text-ink" htmlFor="inst-city">
              Ciudad
            </label>
            <input
              id="inst-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink focus:border-forest-500 focus:outline-none"
              placeholder="Cartagena"
            />
          </div>
          <div>
            <label className="block text-[14px] font-semibold text-ink" htmlFor="inst-country">
              País
            </label>
            <input
              id="inst-country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink focus:border-forest-500 focus:outline-none"
              placeholder="CO"
            />
          </div>
        </div>

        <div>
          <label className="block text-[14px] font-semibold text-ink" htmlFor="inst-domain">
            Dominio de correo (opcional)
          </label>
          <input
            id="inst-domain"
            type="text"
            value={emailDomain}
            onChange={(e) => setEmailDomain(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink focus:border-forest-500 focus:outline-none"
            placeholder="universidad.edu.co"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full sm:w-auto"
        >
          {loading ? "Registrando..." : "Registrar universidad"}
        </button>

        {message && (
          <p
            className={`text-[14px] font-medium ${
              message.type === "success" ? "text-success-text" : "text-danger-text"
            }`}
          >
            {message.text}
          </p>
        )}
      </form>
    </section>
  );
}
