export default function ContactPage() {
    return (
      <div className="container mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
        <p className="mb-4">
          We'd love to hear from you! Reach out to the Green-AI Team using any of
          the following methods:
        </p>
  
        <ul className="space-y-4">
          <li>
            📞 WhatsApp:{" "}
            <a
              href="https://wa.me/201503449731"
              target="_blank"
              className="text-green-500 hover:underline"
            >
              +20 150 344 9731
            </a>
          </li>
  
          <li>
            📧 Email 1:{" "}
            <a
              href="mailto:omar.1824039@stemksheikh.moe.edu.eg"
              className="text-green-500 hover:underline"
            >
              omar.1824039@stemksheikh.moe.edu.eg
            </a>
          </li>
  
          <li>
            📧 Email 2:{" "}
            <a
              href="mailto:elbedawyomar2009@gmail.com"
              className="text-green-500 hover:underline"
            >
              elbedawyomar2009@gmail.com
            </a>
          </li>
        </ul>
      </div>
    );
  }
  