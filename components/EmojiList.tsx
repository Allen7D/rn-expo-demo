import { useState } from 'react';
import { StyleSheet, FlatList, Platform, Pressable } from 'react-native';
import { Image, type ImageSource } from 'expo-image';

type Props = {
	onSelect: (image: ImageSource) => void;
	onCloseModal: () => void;
};

export default function EmojiList({ onSelect, onCloseModal }: Props) {
	const [emoji] = useState<ImageSource[]>([
		require("../assets/images/camera/emoji1.png"),
		require("../assets/images/camera/emoji2.png"),
		require("../assets/images/camera/emoji3.png"),
		require("../assets/images/camera/emoji4.png"),
		require("../assets/images/camera/emoji5.png"),
		require("../assets/images/camera/emoji6.png"),
	]);

	return (
		<FlatList
			// 设置列表为水平滚动
			horizontal
			// 根据系统，控制是否显示水平滚动条
			showsHorizontalScrollIndicator={Platform.OS === 'web'}
			data={emoji}
			contentContainerStyle={styles.listContainer}
			renderItem={({ item, index }) => (
				// 每一张照片都是可点击的
				<Pressable
					onPress={() => {
						onSelect(item);
						onCloseModal();
					}}>
					<Image source={item} key={index} style={styles.image} />
				</Pressable>
			)}
		/>
	);
}

const styles = StyleSheet.create({
	listContainer: {
		borderTopRightRadius: 10,
		borderTopLeftRadius: 10,
		paddingHorizontal: 20,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	image: {
		width: 100,
		height: 100,
		marginRight: 20,
	},
});
