import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function UsersScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>这里是用户页</Text>
      <Text>你传过来的id是: {id}</Text>
      </View>
  );
}