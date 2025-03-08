import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { ImageViewer } from '@/components/ImageViewer';
import { CameraButton } from '@/components/CameraButton';
import IconButton from '@/components/IconButton';
import CircleButton from '@/components/CircleButton';

const PlaceholderImage = require('@/assets/images/camera/background-image.png');

export default function CameraScreen() {
	const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
	const [showAppOptions, setShowAppOptions] = useState<boolean>(false);

	const onReset = () => {
		setShowAppOptions(false);
	};

	const onAddSticker = () => {
		// we will implement this later
	};

	const onSaveImageAsync = async () => {
		// we will implement this later
	};

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
		<View style={styles.container}>
			<View style={styles.imageContainer}>
				<ImageViewer imgSource={PlaceholderImage} selectedImage={selectedImage} />
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
		</View>
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