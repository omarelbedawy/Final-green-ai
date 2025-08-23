import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-6">About Green-AI</h1>

      <section className="mb-12">
        <p className="mb-4">
          Hello! We are the Green-AI Team, and we’re here to guide you through your journey of smart plant care. Our platform is built to help you manage your plants and devices intelligently, using AI and real-time data from IoT devices.
        </p>
        <p className="mb-4">
          With Green-AI, you can add and track multiple plants and devices. Our system updates in real time, so whenever you add a plant or device, it instantly appears on your dashboard. We built this using Firebase Firestore, so each user has their own secure space for managing their plants.
        </p>
        <p className="mb-4">
          We’re not just a dashboard — we are your plant advisors. You can search for any plant, and our AI will provide detailed care instructions, including watering, light, temperature, and soil recommendations. Our platform even integrates with ESP32-CAM devices for live monitoring, making plant care automated and smart.
        </p>
        <p className="mb-4">
          You can also diagnose plant health with our AI-powered disease detection. Simply upload a photo, and we’ll analyze it and suggest remedies if needed. And if you ever have questions, our multilingual chatbot is always ready to answer and guide you in your preferred language.
        </p>
        <p>
          In short, we designed Green-AI to be your companion in creating a thriving garden, combining AI intelligence with real-time IoT monitoring in an easy-to-use web interface.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6">OUR TEAM</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Omar Elbedawy */}
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gray-200">
              <Image
                src="/images/Omar.jpg"
                alt="Omar Elbedawy"
                width={128}
                height={128}
                className="object-cover"
              />
            </div>
            <p className="font-semibold">Omar Elbedawy</p>
          </div>

          {/* Sameh Hasan */}
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gray-200">
              <Image
                src="/images/Sameh.jpg"
                alt="Sameh Hasan"
                width={128}
                height={128}
                className="object-cover"
              />
            </div>
            <p className="font-semibold">Sameh Hasan</p>
          </div>

          {/* Ahmed Nasef */}
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gray-200">
              <Image
                src="/images/Ahmedz.jpg"
                alt="Ahmed Nasef"
                width={128}
                height={128}
                className="object-cover"
              />
            </div>
            <p className="font-semibold">Ahmed Nasef</p>
          </div>
        </div>
      </section>
    </div>
  );
}
