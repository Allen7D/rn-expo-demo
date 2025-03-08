import { Button, View, Text } from "react-native";
import { StackActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";

export default function SettingsScreen() {
  const navigation = useNavigation();
  
  const handlePopToTop = () => {
    const action = StackActions.popToTop();
    navigation.dispatch(action);
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
	  <Text>这里是设置页</Text>
	  <Button title="直接回到首页" onPress={handlePopToTop} />
	</View>
  )
}