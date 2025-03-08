import { View, Button, Text } from "react-native";
import { Link, router } from "expo-router";


export default function ModalScreen() {
	const isPresented = router.canGoBack();

	return (
		<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
			<Text style={{ fontSize: 30 }}> 我是 Modal </Text>
			{/* ../ 表示返回 */}
			{isPresented && <Link href="../" style={{ marginTop: 20 }} asChild>
				<Button title="关闭" />
			</Link>}
		</View>
	)
}