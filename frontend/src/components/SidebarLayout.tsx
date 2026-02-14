import { View, Text, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import TeamsScreen from "../screens/TeamsScreen";
import CoursesScreen from "../screens/Courses";
import TAManager from "../screens/TAManager";
import { useState } from "react";

export default function SidebarLayout() {
  const [activeScreen, setActiveScreen] = useState("Teams");

  // Placeholder user info
  const name = "John Smith";
  const role = "Instructor";

  // Generate initials for user
  const initials = name
  .split(" ")
  .map((n: string) => n[0])
  .join("")
  .toUpperCase();

  const renderScreen = () => {
    switch (activeScreen) {
      case "Teams":
        return <TeamsScreen />;
      case "Courses":
        return <CoursesScreen />;
      case "TAManager":
        return <TAManager />;
    }
  };

  return (
    <View className="flex-1 flex-row">
      {/* Sidebar */}
      <View className="w-60 bg-red-700 p-5">
        <View className="p-4 border-b border-white/10">
          <Image
            source={require("../Images/Iowa_State_Cyclones_logo.png")}
            style={{ width: 80, height: 80, transform: [{ scale: 1.2 }], alignSelf: 'center' }}
            resizeMode="contain"
          />

          <Text className="text-white text-lg font-bold text-center mt-1">
            Class Dashboard
          </Text>
          <Text className="text-yellow-200 mb-6 text-center">
            Iowa State University
          </Text>
        </View>

        {[
          "Teams",
          "Courses",
          "TAManager",
        ].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setActiveScreen(item)}
            className={`rounded-lg px-4 py-3 mb-2 ${
              activeScreen === item ? "bg-yellow-400" : ""
            }`}
          >
            <Text
              className={`font-medium ${
                activeScreen === item
                  ? "text-yellow-900"
                  : "text-white"
              }`}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Signed in user info */}
        <View className="mt-auto pt-6 border-t border-white/10">
          <View className="flex-row items-center gap-3">
            {/* Avatar */}
            <View className="w-10 h-10 rounded-full bg-[#F1BE48] items-center justify-center">
              <Text className="text-gray-800 font-semibold">
                {initials}
              </Text>
            </View>

            {/* Name + Role */}
            <View>
              <Text className="font-semibold text-sm text-white">
                {name}
              </Text>
              <Text className="text-xs text-white/70">
                {role}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 bg-gray-100">
        {renderScreen()}
      </View>
    </View>
  );
}