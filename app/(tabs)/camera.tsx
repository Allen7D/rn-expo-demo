import { useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { type ImageSource } from 'expo-image';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';

import { ImageViewer } from '@/components/ImageViewer';
import { CameraButton } from '@/components/CameraButton';
import IconButton from '@/components/IconButton';
import CircleButton from '@/components/CircleButton';
import EmojiPicker from '@/components/EmojiPicker';
import EmojiList from '@/components/EmojiList';
import EmojiSticker from '@/components/EmojiSticker';

const PlaceholderImage = require('@/assets/images/camera/background-image.png');

export default function CameraScreen() {
	const imageRef = useRef<View>(null);
	const [status, requestPermission] = MediaLibrary.usePermissions();
	const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
	const [showAppOptions, setShowAppOptions] = useState<boolean>(false);
	const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
	const [pickedEmoji, setPickedEmoji] = useState<ImageSource | undefined>(undefined);

	if (status === null) {
		// 申请资源权限
		requestPermission();
	}

	const onReset = () => {
		setShowAppOptions(false);
		setPickedEmoji(undefined);
	};

	const onAddSticker = () => {
		setIsModalVisible(true);
	};

	const onModalClose = () => {
		setIsModalVisible(false);
	};

	const onSaveImageAsync = async () => {
		try {
			// 屏幕截图
			const localUri = await captureRef(imageRef, {
				height: 440,
				quality: 1,
			})

			await MediaLibrary.saveToLibraryAsync(localUri);
			if (localUri) {
				alert('Image saved successfully');
			}
		} catch (e) {
			console.log(e);
		}
	}
	const onPickImageAsync = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			quality: 1,
		});

		if (!result.canceled) {
			// console.log(result);
			setSelectedImage(result.assets[0].uri);
			setShowAppOptions(true);
		} else {
			alert('You cancelled the image picker.');
		}
	}



	return (
		<GestureHandlerRootView style={styles.container}>
			<View style={styles.imageContainer}>
				{/* imageRef */}
				<View ref={imageRef} collapsable={false}>
					<ImageViewer imgSource={PlaceholderImage} selectedImage={selectedImage} />
					{pickedEmoji && <EmojiSticker imageSize={40} stickerSource={pickedEmoji} />}
				</View>
			</View>
			{showAppOptions ? (
				<View style={styles.optionsContainer}>
					<View style={styles.optionsRow}>
						<IconButton icon="refresh" label="Reset" onPress={onReset} />
						<CircleButton onPress={onAddSticker} />
						<IconButton icon="save-alt" label="Save" onPress={onSaveImageAsync} />
					</View>
				</View>
			) : (<View style={styles.footerContainer}>
				<CameraButton theme="primary" label="Choose a photo" onPress={onPickImageAsync} />
				<CameraButton label="Use this photo" onPress={() => setShowAppOptions(true)} />
			</View>)}
			<EmojiPicker isVisible={isModalVisible} onClose={onModalClose}>
				<EmojiList onSelect={setPickedEmoji} onCloseModal={onModalClose} />
			</EmojiPicker>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#25292e',
		alignItems: 'center',
	},
	imageContainer: {
		flex: 1,
		paddingTop: 28,
	},
	footerContainer: {
		flex: 1 / 3,
		alignItems: 'center',
	},
	optionsContainer: {
		position: 'absolute',
		bottom: 80,
	},
	optionsRow: {
		alignItems: 'center',
		flexDirection: 'row',
	},
});