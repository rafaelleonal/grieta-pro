import type { Metadata } from "next";
import Link from "next/link";
import { LegalContact } from "@/components/legal-contact";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Términos de uso | GrietaPro",
  description:
    "Condiciones para usar GrietaPro, sus planes educativos y las integraciones de juego e IA.",
};

const sections = [
  { id: "servicio", title: "Qué ofrece GrietaPro" },
  { id: "cuenta", title: "Tu cuenta y acceso" },
  { id: "cuotas", title: "Planes, cuotas y claves" },
  { id: "contenido", title: "Lo que compartes" },
  { id: "uso", title: "Uso permitido" },
  { id: "terceros", title: "Servicios externos" },
  { id: "propiedad", title: "Propiedad y marcas" },
  { id: "cambios", title: "Cambios y contacto" },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos de uso"
      intro="Estas condiciones explican el alcance de GrietaPro y las responsabilidades al usarlo. Consulta también la política de privacidad antes de crear una cuenta o enviar información."
      sections={sections}
    >
      <section id="servicio">
        <h2>1. Qué ofrece GrietaPro</h2>
        <p>
          GrietaPro es una herramienta educativa en español para preparar partidas de League of
          Legends. Puedes introducir campeones y contexto de juego, revisar los datos extraídos de
          una captura y obtener un plan con ideas sobre matchup, niveles 1–6, mecánicas, compras y
          mapa.
        </p>
        <p>
          Los consejos se generan con inteligencia artificial y pueden contener errores, quedar
          desactualizados o no ajustarse a tu partida. Son orientación para aprender y practicar: no
          representan estadísticas óptimas, asesoría de un jugador Challenger acreditado ni una
          garantía de victorias, ascenso de rango o resultados. Revisa la información y decide cómo
          aplicarla. El ejemplo de demostración no es un análisis de tu partida.
        </p>
        <p>
          GrietaPro no controla el cliente del juego, no ejecuta acciones por ti ni proporciona
          acceso a información oculta del rival. Su integración opcional con Riot importa datos
          disponibles de una partida activa; la línea y el rival requieren tu revisión.
        </p>
      </section>

      <section id="cuenta">
        <h2>2. Tu cuenta y acceso</h2>
        <p>
          Al crear una cuenta o utilizar las funciones del servicio, aceptas estas condiciones.
          Facilita información de registro correcta, verifica tu correo y mantén tu contraseña
          privada. No uses cuentas ajenas ni compartas credenciales. Si detectas un acceso no
          autorizado, cambia tu contraseña y comunícalo por el contacto indicado al final.
        </p>
        <p>
          Si eres menor de edad, utiliza el servicio con la autorización y supervisión de tu madre,
          padre o tutor conforme a la legislación aplicable. GrietaPro no solicita tu contraseña de
          Riot ni sustituye las condiciones de acceso a League of Legends.
        </p>
        <p>
          Podemos restringir consultas o suspender accesos cuando exista abuso, uso no autorizado o
          riesgo para la seguridad del servicio. Puedes solicitar una revisión a través del contacto
          publicado. Estas medidas no eliminan tus derechos sobre tus datos personales.
        </p>
      </section>

      <section id="cuotas">
        <h2>3. Planes, cuotas y claves personales</h2>
        <p>
          El acceso Free y Pro determina las funciones disponibles, modelos, consultas, lecturas de
          capturas, búsquedas y límites de consumo. Consulta tus límites vigentes en la cuenta. El
          acceso Pro puede concederse de cortesía; actualmente GrietaPro no tiene una contratación
          ni un cobro de suscripción implementados. Un rol de administrador no equivale a un plan
          Pro.
        </p>
        <p>
          Los límites de frecuencia, concurrencia y presupuesto pueden impedir una solicitud aunque
          queden consultas disponibles. Volver a generar un plan cuenta como otra consulta. Una
          cancelación o un timeout después del envío puede consumir cuota mientras se determina el
          consumo del proveedor; una respuesta que no pueda mostrarse también puede tener coste.
        </p>
        <p>
          Si eliges usar tu propia clave de OpenRouter, su proveedor puede cobrar las solicitudes a
          tu cuenta según sus condiciones. La clave no evita la autenticación ni los controles de
          cuota y concurrencia de GrietaPro. No compartas la clave con otras personas ni la incluyas
          en notas o capturas.
        </p>
        <p>
          Antes de ofrecer una suscripción de pago publicaremos sus precios, condiciones de
          contratación y cancelación. Cualquier cambio respetará los derechos que reconozca la
          legislación aplicable.
        </p>
      </section>

      <section id="contenido">
        <h2>4. Lo que compartes</h2>
        <p>
          Envía únicamente información que puedas utilizar legítimamente y que sea necesaria para el
          consejo de juego. Recorta o cubre chats, nombres, rostros y otros datos personales de tus
          capturas. No incluyas contraseñas, claves, documentos de identidad ni información
          sensible. Confirma los campeones y el contexto detectados antes de generar el plan.
        </p>
        <p>
          Autorizas el tratamiento de tus entradas para prestar las funciones que solicitas,
          conforme a la <Link href="/privacidad">política de privacidad</Link>. No transfieres la
          propiedad de tu contenido por usar GrietaPro. Los proveedores de IA reciben los datos
          necesarios para responder; revisa sus condiciones antes de enviarlos.
        </p>
      </section>

      <section id="uso">
        <h2>5. Uso permitido</h2>
        <p>
          Usa GrietaPro para aprender y preparar partidas respetando las reglas de Riot y los
          derechos de otras personas. No está permitido:
        </p>
        <ul>
          <li>Intentar acceder a datos, historial o cuentas de otras personas.</li>
          <li>Eludir cuotas, límites, verificaciones o medidas de seguridad.</li>
          <li>Introducir malware, explotar vulnerabilidades o saturar el servicio.</li>
          <li>Usarlo para fraude, acoso o difusión de contenido ilegal.</li>
          <li>
            Crear trampas, automatizar acciones del juego o solicitar ayuda para vulnerar los
            sistemas de Riot.
          </li>
          <li>Presentar GrietaPro como un producto oficial, afiliado o avalado por Riot Games.</li>
        </ul>
      </section>

      <section id="terceros">
        <h2>6. Disponibilidad y servicios externos</h2>
        <p>
          Las funciones de GrietaPro dependen de servicios de alojamiento, autenticación, correo, IA
          y datos de juego. Pueden producirse interrupciones, cambios de API o errores ajenos a
          GrietaPro. No prometemos disponibilidad continua ni una fecha de recuperación determinada.
          Las condiciones y políticas de los proveedores también se aplican a los servicios que
          prestan.
        </p>
        <p>
          La información puede cambiar entre parches. Comprueba las fuentes y el estado actual del
          juego antes de tomar una decisión. Estas condiciones no excluyen las responsabilidades ni
          los derechos irrenunciables que establezca la legislación aplicable.
        </p>
      </section>

      <section id="propiedad">
        <h2>7. Propiedad intelectual y marcas</h2>
        <p>
          League of Legends, los nombres de campeones, sus imágenes y otros elementos del juego
          pertenecen a Riot Games o a sus respectivos titulares. Su presencia en GrietaPro no
          implica afiliación, patrocinio ni aprobación. Respeta sus derechos y las condiciones
          aplicables al reutilizar contenido. Consulta el aviso completo de Riot al pie de esta
          página.
        </p>
      </section>

      <section id="cambios">
        <h2>8. Cambios y contacto</h2>
        <p>
          Publicaremos las modificaciones de estas condiciones en esta página con su fecha de
          revisión. Si un cambio afecta de forma sustancial tu uso del servicio, lo comunicaremos de
          forma visible en la aplicación antes de aplicarlo cuando corresponda. No tendrá efectos
          retroactivos sobre derechos ya adquiridos.
        </p>
        <p>
          Para dudas sobre el servicio, problemas de acceso o solicitudes de revisión, utiliza los
          datos del responsable que aparecen a continuación. Las solicitudes de privacidad se
          atienden conforme al procedimiento de la{" "}
          <Link href="/privacidad#derechos">política de privacidad</Link>.
        </p>
        <LegalContact />
      </section>
    </LegalPage>
  );
}
