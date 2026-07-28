"use client";

import { useState, useEffect } from "react";

type Categoria = "cafeteria" | "brunch" | "comida" | "tragos" | "postres";

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: Categoria;
  foto: string;
  popular?: boolean;
  disponible?: boolean;
}

interface CartItem {
  producto: Producto;
  cantidad: number;
}

const CATEGORIAS: { id: Categoria; label: string; emoji: string; color: string; bgImage: string }[] = [
  { id: "cafeteria", label: "Cafetería", emoji: "☕", color: "#8B6F47", bgImage: "photo-1447933601403-0c6688221566" },
  { id: "comida", label: "Comida", emoji: "🍽️", color: "#C74536", bgImage: "photo-1546069901-ba9599a7e63c" },
  { id: "tragos", label: "Tragos", emoji: "🍹", color: "#6B4C9A", bgImage: "photo-1514432324607-2e467f4af445" },
];

function fmt(n: number) {
  return `$${n.toLocaleString("es-CL")}`;
}

export default function CartaNuevaPage() {
  const [cat, setCat] = useState<Categoria>("cafeteria");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/productos")
      .then(r => r.json())
      .then((data: Producto[]) => setProductos(Array.isArray(data) ? data.filter(p => p.disponible !== false) : []))
      .finally(() => setCargando(false));
  }, []);

  const productosFiltrados = productos.filter(p => p.categoria === cat);
  const totalItems = cart.reduce((s, i) => s + i.cantidad, 0);
  const catInfo = CATEGORIAS.find(c => c.id === cat);

  const agregarAlPedido = (producto: Producto) => {
    const existente = cart.find(i => i.producto.id === producto.id);
    if (existente) {
      setCart(cart.map(i => i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setCart([...cart, { producto, cantidad: 1 }]);
    }
  };

  return (
    <div style={{
      background: "#000000",
      minHeight: "100vh",
      color: "#f5f2ee",
      fontFamily: "var(--font-dm), sans-serif",
    }}>
      {/* Header Premium */}
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(251, 191, 36, 0.1)",
        padding: "20px",
      }}>
        <div style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 900,
            margin: 0,
            color: "#FBBF24",
            fontFamily: "var(--font-raleway)",
          }}>
            Menú
          </h1>
          <button
            style={{
              background: "#FBBF24",
              color: "#1a1200",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 800,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            🛒 ({totalItems})
          </button>
        </div>
      </header>

      {/* Hero Section con imagen de fondo */}
      <div style={{
        marginTop: 80,
        position: "relative",
        height: 500,
        overflow: "hidden",
        marginBottom: 80,
      }}>
        {/* Imagen de fondo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url('https://images.unsplash.com/${catInfo?.bgImage}?auto=format&fit=crop&w=1400&h=600&q=80')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.4)",
          }}
        />

        {/* Overlay con contenido */}
        <div style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "80px 40px",
          background: `linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(${parseInt(catInfo?.color?.slice(1, 3), 16)}, ${parseInt(catInfo?.color?.slice(3, 5), 16)}, ${parseInt(catInfo?.color?.slice(5, 7), 16)}, 0.3) 100%)`,
        }}>
          <div>
            <div style={{
              fontSize: 60,
              marginBottom: 20,
            }}>
              {catInfo?.emoji}
            </div>
            <h2 style={{
              fontSize: "clamp(36px, 6vw, 72px)",
              fontWeight: 900,
              margin: 0,
              color: "#FBBF24",
              fontFamily: "var(--font-raleway)",
              textShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}>
              {catInfo?.label}
            </h2>
            <p style={{
              fontSize: 16,
              color: "#f5f2ee",
              marginTop: 12,
              maxWidth: 600,
              opacity: 0.9,
            }}>
              Descubre nuestras especialidades cuidadosamente seleccionadas
            </p>
          </div>
        </div>
      </div>

      {/* Navegación por categorías - sticky */}
      <div style={{
        position: "sticky",
        top: 80,
        zIndex: 50,
        background: "rgba(0,0,0,0.95)",
        backdropFilter: "blur(10px)",
        padding: "16px 0",
        borderTop: "1px solid rgba(251, 191, 36, 0.1)",
        borderBottom: "1px solid rgba(251, 191, 36, 0.1)",
      }}>
        <div style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 40px",
          display: "flex",
          gap: 12,
          overflow: "auto",
        }}>
          {CATEGORIAS.map(cat_item => (
            <button
              key={cat_item.id}
              onClick={() => setCat(cat_item.id)}
              style={{
                padding: "10px 20px",
                background: cat === cat_item.id ? "#FBBF24" : "transparent",
                color: cat === cat_item.id ? "#1a1200" : "#b0a89f",
                border: cat === cat_item.id ? "none" : "1px solid rgba(251, 191, 36, 0.2)",
                borderRadius: 6,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                transition: "all 0.3s",
              }}
            >
              {cat_item.emoji} {cat_item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Productos - Masonry Layout Creativo */}
      {cargando ? (
        <div style={{ textAlign: "center", padding: "80px 40px", color: "#b0a89f" }}>
          Cargando menú...
        </div>
      ) : (
        <div style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "60px 40px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 28,
          autoRows: "auto",
        }}>
          {productosFiltrados.map((p, idx) => (
            <div
              key={p.id}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => agregarAlPedido(p)}
              style={{
                gridColumn: idx % 5 === 0 ? "span 2" : "span 1",
                position: "relative",
                cursor: "pointer",
                borderRadius: 16,
                overflow: "hidden",
                background: "#1a1a1a",
                border: "1px solid rgba(251, 191, 36, 0.2)",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: hoveredId === p.id ? "translateY(-8px) scale(1.02)" : "translateY(0) scale(1)",
                boxShadow: hoveredId === p.id
                  ? `0 20px 40px rgba(251, 191, 36, 0.3)`
                  : `0 4px 12px rgba(0,0,0,0.3)`,
              }}
            >
              {/* Imagen */}
              <div style={{
                position: "relative",
                height: idx % 5 === 0 ? 280 : 200,
                overflow: "hidden",
                background: "#2a2a2a",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://images.unsplash.com/${p.foto}?auto=format&fit=crop&w=600&h=400&q=85`}
                  alt={p.nombre}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.4s ease",
                    transform: hoveredId === p.id ? "scale(1.1)" : "scale(1)",
                  }}
                />
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: hoveredId === p.id
                    ? "linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)"
                    : "linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)",
                  transition: "all 0.4s",
                }}
                />
              </div>

              {/* Contenido */}
              <div style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                }}>
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#FBBF24",
                    margin: 0,
                    fontFamily: "var(--font-raleway)",
                  }}>
                    {p.nombre}
                  </h3>
                  <span style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#FBBF24",
                    whiteSpace: "nowrap",
                  }}>
                    {fmt(p.precio)}
                  </span>
                </div>

                <p style={{
                  fontSize: 12,
                  color: "#b0a89f",
                  lineHeight: 1.5,
                  margin: 0,
                }}>
                  {p.descripcion}
                </p>

                {hoveredId === p.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      agregarAlPedido(p);
                    }}
                    style={{
                      background: "linear-gradient(135deg, #FBBF24 0%, #FCD34D 100%)",
                      color: "#1a1200",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 16px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: 11,
                      textTransform: "uppercase",
                      marginTop: 8,
                      animation: "slideUp 0.3s ease",
                    }}
                  >
                    + Agregar al pedido
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
