import type { Metadata } from "next";
import { LegalContact } from "@/components/legal-contact";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad | Elociencia",
  description:
    "Qué datos utiliza Elociencia, con quién los comparte y cómo ejercer tus derechos de privacidad.",
};

const sections = [
  { id: "responsable", title: "Responsable y contacto" },
  { id: "datos", title: "Datos que utilizamos" },
  { id: "finalidades", title: "Para qué los utilizamos" },
  { id: "proveedores", title: "Proveedores y datos compartidos" },
  { id: "dispositivo", title: "Cookies y tu dispositivo" },
  { id: "conservacion", title: "Conservación y borrado" },
  { id: "derechos", title: "Tus derechos" },
  { id: "seguridad", title: "Seguridad y menores" },
  { id: "cambios", title: "Cambios a esta política" },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro="Este aviso explica cómo Elociencia trata la información de tu cuenta y de las consultas que decides enviar. La entrada manual está disponible si prefieres no utilizar capturas o importar datos de Riot."
      sections={sections}
    >
      <section id="responsable">
        <h2>1. Responsable y contacto</h2>
        <p>
          El responsable de los datos personales tratados por Elociencia se identifica a
          continuación. Este contacto también recibe solicitudes de privacidad y ejercicio de
          derechos.
        </p>
        <LegalContact />
      </section>

      <section id="datos">
        <h2>2. Datos que utilizamos</h2>
        <ul>
          <li>
            <strong>Cuenta y acceso:</strong> nombre, correo, estado de verificación, contraseña
            protegida mediante hash, identificadores de cuenta, sesiones, fechas de acceso y datos
            técnicos como dirección IP y navegador. También se registran tu rol, plan, invitaciones
            y concesiones de acceso.
          </li>
          <li>
            <strong>Contexto de juego:</strong> campeón, rival, línea, rango declarado, equipos,
            notas y preferencias que introduces o confirmas. Al importar una partida se procesa el
            Riot ID, la región, el identificador de jugador y los datos disponibles de la partida
            activa.
          </li>
          <li>
            <strong>Capturas y resultados:</strong> la imagen que envías se procesa para detectar el
            contexto de juego. Guardamos los campos permitidos del contexto y las respuestas
            validadas: planes del coach y resultados de extracción, que pueden incluir campeones,
            línea, notas y advertencias, para recuperar una solicitud ya procesada.
          </li>
          <li>
            <strong>Uso y consumo:</strong> fechas, operación, modelo, estado de la solicitud,
            identificadores técnicos, huellas de entrada, tokens, cuotas, reservas y costes. Estos
            registros permiten controlar el gasto y evitar repetir consultas ya enviadas.
          </li>
        </ul>
        <p>
          Elociencia no solicita datos personales sensibles, información de pago ni tu contraseña de
          Riot. Evita incluirlos en notas o imágenes. El filtrado del contexto reduce información
          innecesaria, pero no garantiza que todo texto o captura quede anonimizado.
        </p>
      </section>

      <section id="finalidades">
        <h2>3. Para qué utilizamos los datos</h2>
        <p>Las finalidades necesarias para prestar el servicio son:</p>
        <ul>
          <li>Crear, verificar y proteger tu cuenta, mantener la sesión y recuperar el acceso.</li>
          <li>Generar los planes y extraer los datos de juego que solicitas.</li>
          <li>Importar una partida activa cuando decides utilizar la integración con Riot.</li>
          <li>Mostrar tu historial privado y recuperar respuestas de solicitudes anteriores.</li>
          <li>
            Aplicar planes, cuotas y presupuestos, conciliar consumo y prevenir fraude o abuso.
          </li>
          <li>Atender solicitudes de soporte y privacidad.</li>
        </ul>
        <p>
          La versión actual no incorpora publicidad personalizada, venta de datos, campañas de
          marketing ni herramientas de analítica de terceros. Los consejos se adaptan al contexto de
          juego que proporcionas.
        </p>
        <p>
          Puedes elegir la entrada manual, omitir las notas y no activar la importación de Riot o la
          búsqueda web. Si no proporcionas los datos necesarios para una función, esa función puede
          no estar disponible. Cualquier finalidad adicional que requiera autorización se informará
          antes de utilizar tus datos para ella.
        </p>
      </section>

      <section id="proveedores">
        <h2>4. Proveedores y datos compartidos</h2>
        <h3>Inteligencia artificial: OpenRouter y el proveedor del modelo</h3>
        <p>
          Al pedir un plan, nuestro servidor envía los campos de juego permitidos y las
          instrucciones necesarias a OpenRouter, que los transmite al proveedor del modelo. Para
          leer una captura, la imagen se envía a nuestro servidor, se valida y recodifica antes de
          enviarla al servicio de IA. No guardamos las capturas originales ni una copia del mensaje
          completo enviado al modelo en la base de datos de Elociencia.
        </p>
        <p>
          Esto no significa que los proveedores tengan retención cero. La conservación de entradas y
          salidas y su posible uso para mejorar o entrenar modelos dependen del proveedor y de la
          configuración aplicable. No podemos garantizar que todos los proveedores descarten las
          entradas o que las excluyan del entrenamiento. Revisa la{" "}
          <a href="https://openrouter.ai/privacy">política de OpenRouter</a> y las prácticas del
          proveedor del modelo antes de enviar datos.
        </p>
        <p>
          Si introduces una clave personal de OpenRouter, permanece en memoria durante su uso y se
          transmite al servidor para autorizar la consulta con ese proveedor. No se guarda en el
          historial, en el almacenamiento del navegador, en los prompts ni en los registros de la
          aplicación. Se limpia al cerrar sesión o cambiar de cuenta.
        </p>

        <h3>Riot Games</h3>
        <p>
          Cuando solicitas importar una partida, nuestro servidor envía a Riot el Riot ID y la
          región indicados, obtiene el identificador de jugador y consulta la composición disponible
          de la partida activa. Elociencia no utiliza Riot Sign On ni solicita credenciales de tu
          cuenta de Riot. Los recursos de juego, como imágenes de campeones de Data Dragon, pueden
          cargarse directamente desde los servidores de Riot; esa conexión comparte datos técnicos
          como tu IP. Consulta el{" "}
          <a href="https://www.riotgames.com/en/privacy-notice">
            aviso de privacidad de Riot Games
          </a>
          .
        </p>

        <h3>Búsqueda web</h3>
        <p>
          Si activas una búsqueda permitida por tu plan, se utiliza Exa a través de OpenRouter.
          Indicamos al modelo que use una consulta de juego basada en campeones, línea y fecha, sin
          notas personales ni datos de sesión. Es una instrucción al modelo, no una garantía de
          anonimización. Los resultados se usan para apoyar el plan. Consulta la{" "}
          <a href="https://exa.ai/privacy-policy">política de Exa</a>.
        </p>

        <h3>Correo y alojamiento</h3>
        <p>
          Resend procesa tu dirección de correo y el contenido necesario para los mensajes de
          verificación y recuperación de acceso. Estos mensajes son operativos. Consulta la
          <a href="https://resend.com/legal/privacy-policy"> política de Resend</a>.
        </p>
        <p>
          Los servicios de alojamiento y base de datos procesan los datos necesarios para operar
          Elociencia. La identificación del alojamiento, de la base de datos y de su ubicación de
          producción debe completarse antes de abrir el servicio público. Algunos proveedores pueden
          procesar información fuera de tu país; no se promete que todos los datos permanezcan en
          México. Si una transferencia adicional requiere tu consentimiento, se solicitará antes de
          realizarla.
        </p>
      </section>

      <section id="dispositivo">
        <h2>5. Cookies y almacenamiento en tu dispositivo</h2>
        <p>
          Usamos cookies necesarias para autenticar la cuenta y mantener la sesión. La sesión tiene
          una duración configurada de siete días y puede renovarse con el uso. Puedes borrar o
          bloquear las cookies desde tu navegador; al hacerlo puedes perder la sesión o impedir el
          acceso a funciones privadas.
        </p>
        <p>
          El navegador guarda un borrador de preparación separado por cuenta. Se limpia al cerrar
          sesión o cambiar de identidad. Las claves personales, capturas y resultados en memoria
          también se limpian. Puedes eliminar los datos del sitio desde los ajustes de tu navegador.
        </p>
        <p>
          La instalación como PWA permite guardar recursos públicos permitidos. No almacena en su
          caché páginas privadas, respuestas de API, historial ni solicitudes de IA, y no reintenta
          consultas de IA cuando vuelves a tener conexión.
        </p>
      </section>

      <section id="conservacion">
        <h2>6. Conservación y borrado</h2>
        <p>
          Tu cuenta, las sesiones, el historial y los registros de uso se conservan para las
          finalidades descritas. La aplicación no tiene un plazo automático de borrado de todos
          estos registros. No guardamos las capturas originales ni los prompts completos enviados al
          proveedor en nuestra base de datos, aunque sí los contextos permitidos y las respuestas
          validadas indicadas arriba.
        </p>
        <p>
          Al borrar una entrada en Mis sesiones se elimina el plan del historial y la respuesta del
          coach que permitiría recuperarlo al repetir esa solicitud. Se mantienen los registros de
          contabilidad para que el borrado no reinicie el consumo. Esta acción no borra la cuenta ni
          todos los resultados de extracción de capturas.
        </p>
        <p>
          La eliminación de la cuenta, el acceso a una copia de tus datos y la revisión de otros
          resultados se tramitan por el contacto del responsable. Te informaremos del alcance del
          borrado y de los registros que deban mantenerse por una obligación aplicable. La política
          de conservación de respaldos y los proveedores definitivos de producción deben completarse
          antes de abrir el servicio público; esta página no promete una eliminación inmediata de
          copias que no se hayan verificado.
        </p>
      </section>

      <section id="derechos">
        <h2>7. Acceso, rectificación, cancelación y oposición</h2>
        <p>
          Puedes solicitar acceso a tus datos, corregirlos, pedir su cancelación u oponerte al
          tratamiento, así como revocar tu consentimiento o limitar su uso o divulgación. Escribe al
          contacto del responsable con tu nombre, correo de cuenta, petición y datos que ayuden a
          localizarla. Para una corrección, indica el cambio y su sustento.
        </p>
        <p>
          Verificaremos tu identidad por un medio proporcionado, empezando por el control del correo
          de la cuenta. No envíes documentos de identidad de forma espontánea; si hacen falta
          acreditaciones adicionales o actúas por representación, explicaremos cómo aportarlas. La
          atención es manual. Revocar un tratamiento necesario puede impedir la función que depende
          de él.
        </p>
        <p>
          Cuando resulte aplicable la legislación mexicana, la determinación sobre una solicitud
          ARCO se comunica dentro de veinte días hábiles; si procede, se ejecuta dentro de los
          quince siguientes. Ambos plazos pueden ampliarse una sola vez por un periodo igual cuando
          exista justificación. Los derechos y las excepciones aplicables están previstos en la
          <a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf">
            {" "}
            Ley Federal de Protección de Datos Personales en Posesión de los Particulares
          </a>
          .
        </p>
      </section>

      <section id="seguridad">
        <h2>8. Seguridad y menores</h2>
        <p>
          Elociencia aplica controles de sesión, propiedad del historial, validación de entradas y
          restricciones de acceso. Estos controles reducen riesgos, pero ningún servicio puede
          garantizar seguridad absoluta. Mantén tu contraseña privada y utiliza sólo capturas de
          juego que puedas compartir legítimamente.
        </p>
        <p>
          Si eres menor de edad, necesitas la autorización y supervisión de tu madre, padre o tutor
          conforme a la legislación aplicable. Si eres su representante y tienes una consulta sobre
          sus datos, utiliza el contacto del responsable para revisar el caso.
        </p>
      </section>

      <section id="cambios">
        <h2>9. Cambios a esta política</h2>
        <p>
          Publicaremos los cambios en esta página con su fecha de revisión. Los cambios relevantes
          en el tratamiento se comunicarán también de forma visible en la aplicación antes de
          aplicarlos cuando corresponda. Si incorporamos una finalidad o transferencia que requiera
          consentimiento adicional, lo solicitaremos antes de utilizar tus datos para ella.
        </p>
      </section>
    </LegalPage>
  );
}
