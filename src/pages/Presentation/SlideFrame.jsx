/**
 * Marco 16:9 centrado que llena el viewport sin letterbox interno.
 * El asset y los overlays del formulario viven dentro de este marco,
 * así que las posiciones % coinciden con el diseño del slide.
 */
export default function SlideFrame({ children }) {
  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
      <div
        className="relative bg-black"
        style={{
          width: 'min(100vw, calc(100vh * 16 / 9))',
          height: 'min(100vh, calc(100vw * 9 / 16))',
        }}
      >
        {children}
      </div>
    </div>
  )
}
